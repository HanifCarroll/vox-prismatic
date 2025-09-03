using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Core.DTOs.AI;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class InsightExtractionJob
{
    private readonly ILogger<InsightExtractionJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IAIService _aiService;
    private readonly IContentProjectService _projectService;

    public InsightExtractionJob(
        ILogger<InsightExtractionJob> logger,
        ApplicationDbContext context,
        IAIService aiService,
        IContentProjectService projectService)
    {
        _logger = logger;
        _context = context;
        _aiService = aiService;
        _projectService = projectService;
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task ExtractInsights(Guid projectId)
    {
        _logger.LogInformation("Starting insight extraction for project {ProjectId}", projectId);
        
        var job = await CreateProcessingJob(projectId, ProcessingJobType.ExtractInsights);
        
        try
        {
            // Get the project with transcript
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .Include(p => p.Insights)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            if (project.Transcript == null || string.IsNullOrEmpty(project.Transcript.ProcessedContent))
            {
                throw new Exception($"Project {projectId} has no processed transcript");
            }
            
            // Update job status
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 10);
            
            // Extract insights with AI
            _logger.LogInformation("Extracting insights with AI");
            var extractRequest = new ExtractInsightsRequest
            {
                Content = project.Transcript.ProcessedContent,
                MaxInsights = project.WorkflowConfig?.InsightCount ?? 5
            };
            var insightsResult = await _aiService.ExtractInsightsAsync(extractRequest);
            var insights = insightsResult.Insights;
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 60);
            
            // Save insights
            int insightCount = 0;
            foreach (var insightData in insights)
            {
                var insight = new Insight
                {
                    ProjectId = projectId,
                    TranscriptId = project.Transcript.Id,
                    Title = insightData.Title ?? "Insight",
                    Summary = insightData.Summary ?? insightData.Content,
                    Content = insightData.Content,
                    VerbatimQuote = insightData.VerbatimQuote ?? string.Empty,
                    Category = insightData.Category ?? "general",
                    PostType = insightData.PostType ?? "insight",
                    Type = string.Empty, // ExtractedInsight doesn't have Type property
                    Tags = string.Join(",", insightData.Tags ?? new List<string>()),
                    UrgencyScore = insightData.UrgencyScore,
                    RelatabilityScore = insightData.RelatabilityScore,
                    SpecificityScore = insightData.SpecificityScore,
                    AuthorityScore = insightData.AuthorityScore,
                    TotalScore = insightData.UrgencyScore + insightData.RelatabilityScore + insightData.SpecificityScore + insightData.AuthorityScore,
                    Status = InsightStatus.Draft,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _context.Insights.Add(insight);
                insightCount++;
            }
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 80);
            
            // Update project stage
            project.TransitionTo(ProjectStage.InsightsReady);
            
            // Update metrics
            project.Metrics.InsightCount = insightCount;
            project.Metrics.LastInsightExtractionAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Complete job
            await CompleteJob(job, insightCount);
            
            _logger.LogInformation("Extracted {Count} insights for project {ProjectId}", insightCount, projectId);
            
            // Log event
            await LogProjectEvent(projectId.ToString(), "insights_extracted", $"Extracted {insightCount} insights");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting insights for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
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

    private async Task LogProjectEvent(string projectId, string eventType, string description)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = Guid.Parse(projectId),
            ActivityType = eventType,
            ActivityName = description,
            Description = description,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
    
    // Method for RecurringJobService compatibility
    public async Task ExtractInsightsFromTranscripts()
    {
        _logger.LogInformation("Starting batch insight extraction from transcripts");
        
        // Find projects that need insight extraction
        var projects = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Where(p => p.CurrentStage == ProjectStage.ProcessingContent 
                && p.Transcript != null 
                && !string.IsNullOrEmpty(p.Transcript.ProcessedContent)
                && !p.Insights.Any())
            .Take(5) // Process 5 at a time
            .ToListAsync();
        
        foreach (var project in projects)
        {
            try
            {
                await ExtractInsights(project.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to extract insights for project {ProjectId}", project.Id);
            }
        }
        
        _logger.LogInformation("Completed batch insight extraction for {Count} projects", projects.Count);
    }
}