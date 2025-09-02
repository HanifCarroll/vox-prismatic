using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Worker.Jobs;

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
    public async Task ExtractInsights(string projectId)
    {
        _logger.LogInformation("Starting insight extraction for project {ProjectId}", projectId);
        
        var job = await CreateProcessingJob(projectId, "insight_extraction");
        
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
            await UpdateJobStatus(job, "processing", 10);
            
            // Extract insights with AI
            _logger.LogInformation("Extracting insights with AI");
            var insights = await _aiService.ExtractInsightsAsync(
                project.Transcript.ProcessedContent,
                project.WorkflowConfig?.InsightCount ?? 5);
            
            await UpdateJobStatus(job, "processing", 60);
            
            // Save insights
            int insightCount = 0;
            foreach (var insightData in insights)
            {
                var insight = new Insight
                {
                    ProjectId = projectId,
                    Content = insightData.Content,
                    Type = insightData.Type,
                    Tags = insightData.Tags,
                    Status = "draft",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _context.Insights.Add(insight);
                insightCount++;
            }
            
            await UpdateJobStatus(job, "processing", 80);
            
            // Update project stage
            project.CurrentStage = "insights_ready";
            project.UpdatedAt = DateTime.UtcNow;
            
            // Update metrics
            project.Metrics.InsightCount = insightCount;
            project.Metrics.LastInsightExtractionAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Complete job
            await CompleteJob(job, insightCount);
            
            _logger.LogInformation("Extracted {Count} insights for project {ProjectId}", insightCount, projectId);
            
            // Log event
            await LogProjectEvent(projectId, "insights_extracted", $"Extracted {insightCount} insights");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting insights for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(string projectId, string jobType)
    {
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = jobType,
            Status = "queued",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        return job;
    }

    private async Task UpdateJobStatus(ProjectProcessingJob job, string status, int progress)
    {
        job.Status = status;
        job.Progress = progress;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (status == "processing" && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CompleteJob(ProjectProcessingJob job, int resultCount)
    {
        job.Status = "completed";
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
        job.Status = "failed";
        job.ErrorMessage = errorMessage;
        job.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
    }

    private async Task LogProjectEvent(string projectId, string eventType, string description)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = eventType,
            ActivityName = description,
            Description = description,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
}