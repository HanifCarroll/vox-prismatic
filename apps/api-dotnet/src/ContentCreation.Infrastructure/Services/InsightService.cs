using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using AutoMapper;

namespace ContentCreation.Infrastructure.Services;

public class InsightService : IInsightService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IInsightStateService _stateService;
    private readonly ILogger<InsightService> _logger;

    public InsightService(
        ApplicationDbContext context,
        IMapper mapper,
        IInsightStateService stateService,
        ILogger<InsightService> logger)
    {
        _context = context;
        _mapper = mapper;
        _stateService = stateService;
        _logger = logger;
    }

    public async Task<InsightDto> CreateAsync(CreateInsightDto dto)
    {
        _logger.LogInformation("Creating insight: {Title}", dto.Title);

        var transcriptId = dto.CleanedTranscriptId;
        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .FirstOrDefaultAsync(t => t.Id == transcriptId);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {transcriptId} not found");
        }

        var insight = new Insight
        {
            Id = GenerateId("insight"),
            ProjectId = transcript.ProjectId,
            TranscriptId = transcriptId,
            Title = dto.Title,
            Summary = dto.Summary,
            VerbatimQuote = dto.VerbatimQuote,
            Category = dto.Category,
            PostType = dto.PostType,
            Status = "draft",
            UrgencyScore = dto.UrgencyScore,
            RelatabilityScore = dto.RelatabilityScore,
            SpecificityScore = dto.SpecificityScore,
            AuthorityScore = dto.AuthorityScore,
            OverallScore = CalculateOverallScore(dto),
            ProcessingDurationMs = dto.ProcessingDurationMs,
            EstimatedTokens = dto.EstimatedTokens,
            EstimatedCost = dto.EstimatedCost,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Insights.Add(insight);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created insight: {InsightId}", insight.Id);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<List<InsightDto>> GetAllAsync(InsightFilterDto? filter = null)
    {
        _logger.LogInformation("Getting all insights");

        var query = _context.Insights
            .Include(i => i.ContentProject)
            .Include(i => i.Transcript)
            .AsQueryable();

        if (filter != null)
        {
            query = ApplyFilter(query, filter);
        }

        var insights = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<InsightDto>>(insights);
    }

    public async Task<InsightDto> GetByIdAsync(string id)
    {
        _logger.LogInformation("Finding insight: {InsightId}", id);

        var insight = await _context.Insights
            .Include(i => i.ContentProject)
            .Include(i => i.Transcript)
            .Include(i => i.Posts)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<List<InsightDto>> GetByTranscriptIdAsync(string transcriptId)
    {
        _logger.LogInformation("Finding insights for transcript: {TranscriptId}", transcriptId);

        var insights = await _context.Insights
            .Where(i => i.TranscriptId == transcriptId)
            .Include(i => i.ContentProject)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<InsightDto>>(insights);
    }

    public async Task<List<InsightDto>> GetByProjectIdAsync(string projectId)
    {
        _logger.LogInformation("Finding insights for project: {ProjectId}", projectId);

        var insights = await _context.Insights
            .Where(i => i.ProjectId == projectId)
            .Include(i => i.Transcript)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<InsightDto>>(insights);
    }

    public async Task<InsightDto> UpdateAsync(string id, UpdateInsightDto dto)
    {
        _logger.LogInformation("Updating insight: {InsightId}", id);

        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        if (!string.IsNullOrEmpty(dto.Title))
            insight.Title = dto.Title;
        if (!string.IsNullOrEmpty(dto.Summary))
            insight.Summary = dto.Summary;
        if (!string.IsNullOrEmpty(dto.VerbatimQuote))
            insight.VerbatimQuote = dto.VerbatimQuote;
        if (!string.IsNullOrEmpty(dto.Category))
            insight.Category = dto.Category;
        if (!string.IsNullOrEmpty(dto.PostType))
            insight.PostType = dto.PostType;

        if (dto.UrgencyScore.HasValue)
            insight.UrgencyScore = dto.UrgencyScore.Value;
        if (dto.RelatabilityScore.HasValue)
            insight.RelatabilityScore = dto.RelatabilityScore.Value;
        if (dto.SpecificityScore.HasValue)
            insight.SpecificityScore = dto.SpecificityScore.Value;
        if (dto.AuthorityScore.HasValue)
            insight.AuthorityScore = dto.AuthorityScore.Value;

        if (dto.UrgencyScore.HasValue || dto.RelatabilityScore.HasValue || 
            dto.SpecificityScore.HasValue || dto.AuthorityScore.HasValue)
        {
            insight.OverallScore = CalculateOverallScore(insight);
        }

        insight.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated insight: {InsightId}", id);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task DeleteAsync(string id)
    {
        _logger.LogInformation("Removing insight: {InsightId}", id);

        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        _context.Insights.Remove(insight);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Removed insight: {InsightId}", id);
    }

    public async Task<Dictionary<string, int>> GetStatusCountsAsync()
    {
        _logger.LogInformation("Getting insight status counts");

        var counts = await _context.Insights
            .GroupBy(i => i.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count);

        var allStatuses = new[] { "draft", "needs_review", "approved", "rejected", "archived" };
        foreach (var status in allStatuses)
        {
            if (!counts.ContainsKey(status))
            {
                counts[status] = 0;
            }
        }

        return counts;
    }

    public async Task<BulkOperationResponseDto> BulkOperationAsync(BulkInsightOperationDto dto)
    {
        if (!dto.InsightIds.Any())
        {
            throw new ArgumentException("No insight IDs provided");
        }

        _logger.LogInformation("Performing bulk operation {Action} on {Count} insights", 
            dto.Action, dto.InsightIds.Count);

        var failedIds = new List<string>();
        var successCount = 0;

        foreach (var insightId in dto.InsightIds)
        {
            try
            {
                switch (dto.Action)
                {
                    case BulkInsightAction.Approve:
                        await _stateService.ApproveInsightAsync(insightId, dto.ReviewedBy ?? "system");
                        break;
                    case BulkInsightAction.Reject:
                        await _stateService.RejectInsightAsync(insightId, dto.ReviewedBy ?? "system", 
                            dto.Reason ?? "Bulk rejection");
                        break;
                    case BulkInsightAction.Archive:
                        await _stateService.ArchiveInsightAsync(insightId, dto.Reason ?? "Bulk archive");
                        break;
                    case BulkInsightAction.NeedsReview:
                        await _stateService.SubmitForReviewAsync(insightId);
                        break;
                    default:
                        throw new ArgumentException($"Invalid action: {dto.Action}");
                }
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to {Action} insight {InsightId}", dto.Action, insightId);
                failedIds.Add(insightId);
            }
        }

        var message = $"Successfully {dto.Action.ToString().ToLower()}d {successCount} insights";
        if (failedIds.Any())
        {
            message += $", {failedIds.Count} failed";
        }

        _logger.LogInformation("Bulk operation completed: {Message}", message);

        return new BulkOperationResponseDto
        {
            UpdatedCount = successCount,
            Action = dto.Action.ToString(),
            Message = message,
            FailedIds = failedIds.Any() ? failedIds : null
        };
    }

    private IQueryable<Insight> ApplyFilter(IQueryable<Insight> query, InsightFilterDto filter)
    {
        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(i => i.Status == filter.Status);

        if (!string.IsNullOrEmpty(filter.Category))
            query = query.Where(i => i.Category == filter.Category);

        if (!string.IsNullOrEmpty(filter.PostType))
            query = query.Where(i => i.PostType == filter.PostType);

        if (!string.IsNullOrEmpty(filter.TranscriptId))
            query = query.Where(i => i.TranscriptId == filter.TranscriptId);

        if (!string.IsNullOrEmpty(filter.ProjectId))
            query = query.Where(i => i.ProjectId == filter.ProjectId);

        if (filter.HasPosts.HasValue)
        {
            query = filter.HasPosts.Value
                ? query.Where(i => i.Posts.Any())
                : query.Where(i => !i.Posts.Any());
        }

        if (filter.MinScore.HasValue)
            query = query.Where(i => i.OverallScore >= filter.MinScore.Value);

        if (filter.MaxScore.HasValue)
            query = query.Where(i => i.OverallScore <= filter.MaxScore.Value);

        if (filter.CreatedAfter.HasValue)
            query = query.Where(i => i.CreatedAt >= filter.CreatedAfter.Value);

        if (filter.CreatedBefore.HasValue)
            query = query.Where(i => i.CreatedAt <= filter.CreatedBefore.Value);

        query = filter.SortBy?.ToLower() switch
        {
            "title" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(i => i.Title) 
                : query.OrderByDescending(i => i.Title),
            "category" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(i => i.Category) 
                : query.OrderByDescending(i => i.Category),
            "score" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(i => i.OverallScore) 
                : query.OrderByDescending(i => i.OverallScore),
            "status" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(i => i.Status) 
                : query.OrderByDescending(i => i.Status),
            _ => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(i => i.CreatedAt) 
                : query.OrderByDescending(i => i.CreatedAt)
        };

        var skip = (filter.Page - 1) * filter.PageSize;
        query = query.Skip(skip).Take(filter.PageSize);

        return query;
    }

    private int CalculateOverallScore(CreateInsightDto dto)
    {
        var scores = new[] { dto.UrgencyScore, dto.RelatabilityScore, dto.SpecificityScore, dto.AuthorityScore };
        return (int)Math.Round(scores.Average());
    }

    private int CalculateOverallScore(Insight insight)
    {
        var scores = new[] { insight.UrgencyScore, insight.RelatabilityScore, insight.SpecificityScore, insight.AuthorityScore };
        return (int)Math.Round(scores.Average());
    }

    private string GenerateId(string prefix)
    {
        return $"{prefix}_{Guid.NewGuid():N}".Substring(0, 20);
    }
}