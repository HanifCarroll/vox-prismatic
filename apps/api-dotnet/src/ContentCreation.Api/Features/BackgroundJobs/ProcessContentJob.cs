using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Core.DTOs.AI;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class ProcessContentJob
{
    private readonly ILogger<ProcessContentJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IDeepgramService _deepgramService;
    private readonly IAIService _aiService;
    private readonly IContentProjectService _projectService;

    public ProcessContentJob(
        ILogger<ProcessContentJob> logger,
        ApplicationDbContext context,
        IDeepgramService deepgramService,
        IAIService aiService,
        IContentProjectService projectService)
    {
        _logger = logger;
        _context = context;
        _deepgramService = deepgramService;
        _aiService = aiService;
        _projectService = projectService;
    }

    [Queue("critical")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task ProcessContent(Guid projectId, string contentUrl, string contentType = "audio")
    {
        _logger.LogInformation("Starting content processing for project {ProjectId}, type: {ContentType}", 
            projectId, contentType);
        
        var job = await CreateProcessingJob(projectId, ProcessingJobType.ProcessContent);
        
        try
        {
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 10);
            
            string rawContent;
            
            switch (contentType.ToLower())
            {
                case "audio":
                case "video":
                    _logger.LogInformation("Transcribing audio/video content with Deepgram");
                    rawContent = await _deepgramService.TranscribeAudioAsync(contentUrl);
                    break;
                    
                case "text":
                case "article":
                    _logger.LogInformation("Processing text content");
                    rawContent = await FetchTextContent(contentUrl);
                    break;
                    
                case "document":
                    _logger.LogInformation("Processing document content");
                    rawContent = await ProcessDocumentContent(contentUrl);
                    break;
                    
                default:
                    throw new NotSupportedException($"Content type {contentType} is not supported");
            }
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 50);
            
            _logger.LogInformation("Cleaning and processing content with AI");
            var cleanRequest = new CleanTranscriptRequest
            {
                RawContent = rawContent,
                SourceType = contentType ?? "text"
            };
            var cleanResult = await _aiService.CleanTranscriptAsync(cleanRequest);
            var processedContent = cleanResult.CleanedContent;
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 80);
            
            if (project.Transcript != null)
            {
                project.Transcript.RawContent = rawContent;
                project.Transcript.ProcessedContent = processedContent;
                project.Transcript.Status = TranscriptStatus.Processed;
                // ContentType property doesn't exist on Transcript
                project.Transcript.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var transcript = new Transcript
                {
                    ProjectId = projectId,
                    RawContent = rawContent,
                    ProcessedContent = processedContent,
                    Status = TranscriptStatus.Processed,
                    // ContentType = contentType, // Property doesn't exist
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Transcripts.Add(transcript);
            }
            
            project.CurrentStage = "content_processed";
            project.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            await CompleteJob(job, 1);
            
            _logger.LogInformation("Content processing completed for project {ProjectId}", projectId);
            
            if (project.WorkflowConfig?.AutoApproveInsights == true)
            {
                BackgroundJob.Enqueue<InsightExtractionJob>(job => job.ExtractInsights(projectId));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing content for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    [Queue("default")]
    public async Task ProcessBatchContent(List<(Guid ProjectId, string ContentUrl, string ContentType)> contentItems)
    {
        _logger.LogInformation("Processing batch of {Count} content items", contentItems.Count);
        
        var successCount = 0;
        var failedItems = new List<string>();
        
        foreach (var (projectId, contentUrl, contentType) in contentItems)
        {
            try
            {
                await ProcessContent(projectId, contentUrl, contentType);
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process content for project {ProjectId}", projectId);
                failedItems.Add(projectId);
            }
        }
        
        _logger.LogInformation("Batch processing completed. Success: {Success}, Failed: {Failed}",
            successCount, failedItems.Count);
        
        if (failedItems.Any())
        {
            throw new Exception($"Failed to process {failedItems.Count} items: {string.Join(", ", failedItems)}");
        }
    }

    [Queue("default")]
    public async Task ReprocessContent(Guid projectId, bool preserveEdits = true)
    {
        _logger.LogInformation("Reprocessing content for project {ProjectId}, preserve edits: {PreserveEdits}",
            projectId, preserveEdits);
        
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        
        if (project?.Transcript == null)
        {
            throw new Exception($"Project {projectId} or its transcript not found");
        }
        
        var originalProcessed = project.Transcript.ProcessedContent;
        var rawContent = project.Transcript.RawContent;
        
        if (string.IsNullOrEmpty(rawContent))
        {
            throw new Exception("No raw content available for reprocessing");
        }
        
        var cleanRequest = new CleanTranscriptRequest
        {
            RawContent = rawContent,
            SourceType = "text"
        };
        var cleanResult = await _aiService.CleanTranscriptAsync(cleanRequest);
        var newProcessedContent = cleanResult.CleanedContent;
        
        if (preserveEdits && !string.IsNullOrEmpty(originalProcessed))
        {
            newProcessedContent = await MergeContentEdits(originalProcessed, newProcessedContent);
        }
        
        project.Transcript.ProcessedContent = newProcessedContent;
        project.Transcript.Status = TranscriptStatus.Processed;
        project.Transcript.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Content reprocessing completed for project {ProjectId}", projectId);
    }

    private async Task<string> FetchTextContent(string url)
    {
        using var httpClient = new HttpClient();
        return await httpClient.GetStringAsync(url);
    }

    private async Task<string> ProcessDocumentContent(string url)
    {
        _logger.LogInformation("Processing document from URL: {Url}", url);
        return await Task.FromResult($"Document content from {url}");
    }

    private async Task<string> MergeContentEdits(string original, string newContent)
    {
        return await Task.FromResult(newContent);
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(Guid projectId, ProcessingJobType jobType)
    {
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = jobType,
            Status = ProcessingJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        return job;
    }

    private async Task UpdateJobStatus(ProjectProcessingJob job, ProcessingJobStatus status, int progress)
    {
        job.Status = status;
        job.Progress = progress;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (status == ProcessingJobStatus.Processing && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CompleteJob(ProjectProcessingJob job, int resultCount)
    {
        job.Status = ProcessingJobStatus.Completed;
        job.Progress = 100;
        job.ResultCount = resultCount;
        job.CompletedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (job.StartedAt.HasValue)
        {
            job.DurationMs = (int)(job.CompletedAt.Value - job.StartedAt.Value).TotalMilliseconds;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task FailJob(ProjectProcessingJob job, string errorMessage)
    {
        job.Status = ProcessingJobStatus.Failed;
        job.ErrorMessage = errorMessage;
        job.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
    }
}