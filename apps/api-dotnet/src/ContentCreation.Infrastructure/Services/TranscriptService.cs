using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using AutoMapper;
using MediatR;
using Hangfire;

namespace ContentCreation.Infrastructure.Services;

public class TranscriptService : ITranscriptService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IMediator _mediator;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<TranscriptService> _logger;

    public TranscriptService(
        ApplicationDbContext context,
        IMapper mapper,
        IMediator mediator,
        IBackgroundJobClient backgroundJobClient,
        ILogger<TranscriptService> logger)
    {
        _context = context;
        _mapper = mapper;
        _mediator = mediator;
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    public async Task<TranscriptDto> CreateAsync(CreateTranscriptDto dto)
    {
        _logger.LogInformation("Creating transcript: {Title}", dto.Title);

        // If ProjectId is provided, verify it exists
        ContentProject? project = null;
        if (!string.IsNullOrEmpty(dto.ProjectId))
        {
            project = await _context.ContentProjects.FindAsync(dto.ProjectId);
            if (project == null)
            {
                throw new KeyNotFoundException($"Project with ID {dto.ProjectId} not found");
            }
        }
        else
        {
            // Create a new project for this transcript
            project = new ContentProject
            {
                Id = GenerateId("project"),
                Title = dto.Title,
                Description = $"Project for transcript: {dto.Title}",
                SourceType = dto.SourceType.ToString(),
                SourceUrl = dto.SourceUrl,
                FileName = dto.FileName,
                CurrentStage = ProjectLifecycleStage.RawContent,
                OverallProgress = 0,
                Tags = new List<string>(),
                TargetPlatforms = new List<string> { "LinkedIn", "X" },
                CreatedBy = Guid.Empty, // TODO: Get from current user
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                LastActivityAt = DateTime.UtcNow
            };
            _context.ContentProjects.Add(project);
        }

        // Calculate word count
        var wordCount = dto.RawContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

        var transcript = new Transcript
        {
            Id = GenerateId("transcript"),
            ProjectId = project.Id,
            Title = dto.Title,
            RawContent = dto.RawContent,
            Status = "raw",
            SourceType = dto.SourceType.ToString(),
            SourceUrl = dto.SourceUrl,
            FileName = dto.FileName,
            WordCount = wordCount,
            Duration = dto.Duration,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Transcripts.Add(transcript);
        await _context.SaveChangesAsync();

        // Trigger automatic processing pipeline
        var jobId = _backgroundJobClient.Enqueue(() => ProcessTranscript(transcript.Id));
        _logger.LogInformation("Scheduled processing job {JobId} for transcript {TranscriptId}", jobId, transcript.Id);

        // Publish transcript uploaded event (for event-driven architecture)
        await PublishTranscriptUploadedEvent(transcript);

        _logger.LogInformation("Created transcript: {TranscriptId}", transcript.Id);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<List<TranscriptDto>> GetAllAsync(TranscriptFilterDto? filter = null)
    {
        _logger.LogInformation("Getting all transcripts");

        var query = _context.Transcripts
            .Include(t => t.ContentProject)
            .AsQueryable();

        if (filter != null)
        {
            query = ApplyFilter(query, filter);
        }

        var transcripts = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<TranscriptDto>>(transcripts);
    }

    public async Task<TranscriptDto> GetByIdAsync(string id)
    {
        _logger.LogInformation("Finding transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .Include(t => t.Insights)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<List<TranscriptDto>> GetByProjectIdAsync(string projectId)
    {
        _logger.LogInformation("Finding transcripts for project: {ProjectId}", projectId);

        var transcripts = await _context.Transcripts
            .Where(t => t.ProjectId == projectId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<TranscriptDto>>(transcripts);
    }

    public async Task<TranscriptDto> UpdateAsync(string id, UpdateTranscriptDto dto)
    {
        _logger.LogInformation("Updating transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts.FindAsync(id);
        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        if (!string.IsNullOrEmpty(dto.Title))
            transcript.Title = dto.Title;
        if (!string.IsNullOrEmpty(dto.RawContent))
        {
            transcript.RawContent = dto.RawContent;
            transcript.WordCount = dto.RawContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        }
        if (!string.IsNullOrEmpty(dto.CleanedContent))
            transcript.CleanedContent = dto.CleanedContent;
        
        if (dto.ProcessingDurationMs.HasValue)
            transcript.ProcessingDurationMs = dto.ProcessingDurationMs.Value;
        if (dto.EstimatedTokens.HasValue)
            transcript.EstimatedTokens = dto.EstimatedTokens.Value;
        if (dto.EstimatedCost.HasValue)
            transcript.EstimatedCost = dto.EstimatedCost.Value;
        if (!string.IsNullOrEmpty(dto.QueueJobId))
            transcript.QueueJobId = dto.QueueJobId;
        if (!string.IsNullOrEmpty(dto.ErrorMessage))
            transcript.ErrorMessage = dto.ErrorMessage;
        if (dto.FailedAt.HasValue)
            transcript.FailedAt = dto.FailedAt.Value;

        transcript.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated transcript: {TranscriptId}", id);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task DeleteAsync(string id)
    {
        _logger.LogInformation("Deleting transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.Insights)
            .FirstOrDefaultAsync(t => t.Id == id);
            
        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Use transaction to ensure atomic delete
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Delete related insights first
            if (transcript.Insights?.Any() == true)
            {
                // Delete posts related to insights
                var insightIds = transcript.Insights.Select(i => i.Id).ToList();
                var posts = await _context.Posts
                    .Where(p => insightIds.Contains(p.InsightId))
                    .ToListAsync();
                
                if (posts.Any())
                {
                    _context.Posts.RemoveRange(posts);
                }

                _context.Insights.RemoveRange(transcript.Insights);
            }

            _context.Transcripts.Remove(transcript);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Publish transcript deleted event
            await PublishTranscriptDeletedEvent(transcript);

            _logger.LogInformation("Deleted transcript: {TranscriptId}", id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to delete transcript {TranscriptId}", id);
            throw;
        }
    }

    public async Task<TranscriptStatsDto> GetStatsAsync()
    {
        _logger.LogInformation("Getting transcript statistics");

        var totalCount = await _context.Transcripts.CountAsync();
        
        var statusCounts = await _context.Transcripts
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var sourceTypeCounts = await _context.Transcripts
            .GroupBy(t => t.SourceType ?? "manual")
            .Select(g => new { SourceType = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SourceType, x => x.Count);

        var stats = new TranscriptStatsDto
        {
            Total = totalCount,
            Raw = statusCounts.FirstOrDefault(s => s.Status == "raw")?.Count ?? 0,
            Processing = statusCounts.FirstOrDefault(s => s.Status == "processing")?.Count ?? 0,
            Cleaned = statusCounts.FirstOrDefault(s => s.Status == "cleaned")?.Count ?? 0,
            InsightsGenerated = statusCounts.FirstOrDefault(s => s.Status == "insights_generated")?.Count ?? 0,
            PostsCreated = statusCounts.FirstOrDefault(s => s.Status == "posts_created")?.Count ?? 0,
            Error = statusCounts.FirstOrDefault(s => s.Status == "error")?.Count ?? 0,
            BySourceType = sourceTypeCounts
        };

        return stats;
    }

    public async Task<List<TranscriptDto>> GetTranscriptsForProcessingAsync()
    {
        _logger.LogInformation("Getting transcripts ready for processing");

        var transcripts = await _context.Transcripts
            .Where(t => t.Status == "raw")
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<TranscriptDto>>(transcripts);
    }

    private IQueryable<Transcript> ApplyFilter(IQueryable<Transcript> query, TranscriptFilterDto filter)
    {
        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(t => t.Status == filter.Status);

        if (!string.IsNullOrEmpty(filter.SourceType))
            query = query.Where(t => t.SourceType == filter.SourceType);

        if (!string.IsNullOrEmpty(filter.ProjectId))
            query = query.Where(t => t.ProjectId == filter.ProjectId);

        if (filter.HasCleanedContent.HasValue)
        {
            query = filter.HasCleanedContent.Value
                ? query.Where(t => !string.IsNullOrEmpty(t.CleanedContent))
                : query.Where(t => string.IsNullOrEmpty(t.CleanedContent));
        }

        if (filter.HasError.HasValue)
        {
            query = filter.HasError.Value
                ? query.Where(t => !string.IsNullOrEmpty(t.ErrorMessage))
                : query.Where(t => string.IsNullOrEmpty(t.ErrorMessage));
        }

        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.ToLower();
            query = query.Where(t => 
                t.Title.ToLower().Contains(searchTerm) ||
                t.RawContent.ToLower().Contains(searchTerm) ||
                (t.CleanedContent != null && t.CleanedContent.ToLower().Contains(searchTerm)));
        }

        if (filter.CreatedAfter.HasValue)
            query = query.Where(t => t.CreatedAt >= filter.CreatedAfter.Value);

        if (filter.CreatedBefore.HasValue)
            query = query.Where(t => t.CreatedAt <= filter.CreatedBefore.Value);

        query = filter.SortBy?.ToLower() switch
        {
            "title" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(t => t.Title) 
                : query.OrderByDescending(t => t.Title),
            "status" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(t => t.Status) 
                : query.OrderByDescending(t => t.Status),
            "wordcount" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(t => t.WordCount) 
                : query.OrderByDescending(t => t.WordCount),
            "updatedat" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(t => t.UpdatedAt) 
                : query.OrderByDescending(t => t.UpdatedAt),
            _ => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(t => t.CreatedAt) 
                : query.OrderByDescending(t => t.CreatedAt)
        };

        var skip = (filter.Page - 1) * filter.PageSize;
        query = query.Skip(skip).Take(filter.PageSize);

        return query;
    }

    private async Task PublishTranscriptUploadedEvent(Transcript transcript)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            // For now, it's a placeholder
            _logger.LogInformation("Published transcript uploaded event for {TranscriptId}", transcript.Id);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish transcript uploaded event");
        }
    }

    private async Task PublishTranscriptDeletedEvent(Transcript transcript)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            // For now, it's a placeholder
            _logger.LogInformation("Published transcript deleted event for {TranscriptId}", transcript.Id);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish transcript deleted event");
        }
    }

    // This method would be executed by Hangfire
    public static void ProcessTranscript(string transcriptId)
    {
        // This would trigger the transcript processing pipeline
        // For now, it's a placeholder
        Console.WriteLine($"Processing transcript: {transcriptId}");
    }

    private string GenerateId(string prefix)
    {
        return $"{prefix}_{Guid.NewGuid():N}".Substring(0, 20);
    }
}