using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Worker.Jobs;

public class PostGenerationJob
{
    private readonly ILogger<PostGenerationJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IAiService _aiService;
    private readonly IContentProjectService _projectService;

    public PostGenerationJob(
        ILogger<PostGenerationJob> logger,
        ApplicationDbContext context,
        IAiService aiService,
        IContentProjectService projectService)
    {
        _logger = logger;
        _context = context;
        _aiService = aiService;
        _projectService = projectService;
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task GeneratePosts(string projectId, List<string>? insightIds = null)
    {
        _logger.LogInformation("Starting post generation for project {ProjectId}", projectId);
        
        var job = await CreateProcessingJob(projectId, "post_generation");
        
        try
        {
            // Get the project with insights
            var project = await _context.ContentProjects
                .Include(p => p.Insights)
                .Include(p => p.Posts)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            // Get insights to generate posts from
            var insights = project.Insights
                .Where(i => i.Status == "approved")
                .Where(i => insightIds == null || insightIds.Contains(i.Id))
                .ToList();
            
            if (!insights.Any())
            {
                throw new Exception($"No approved insights found for project {projectId}");
            }
            
            await UpdateJobStatus(job, "processing", 10);
            
            // Generate posts for each insight
            int postCount = 0;
            int progressStep = 80 / insights.Count;
            int currentProgress = 10;
            
            foreach (var insight in insights)
            {
                _logger.LogInformation("Generating posts for insight {InsightId}", insight.Id);
                
                // Generate posts with AI for each platform
                var platforms = project.WorkflowConfig?.TargetPlatforms ?? new List<string> { "linkedin", "twitter" };
                
                foreach (var platform in platforms)
                {
                    var postContent = await _aiService.GeneratePostAsync(
                        insight.Content,
                        platform,
                        project.WorkflowConfig?.PostStyle ?? "professional");
                    
                    var post = new Post
                    {
                        ProjectId = projectId,
                        InsightId = insight.Id,
                        Platform = platform,
                        Content = postContent.Content,
                        Hashtags = postContent.Hashtags,
                        Status = "draft",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    _context.Posts.Add(post);
                    postCount++;
                }
                
                currentProgress += progressStep;
                await UpdateJobStatus(job, "processing", currentProgress);
            }
            
            // Update project stage
            project.CurrentStage = "posts_ready";
            project.UpdatedAt = DateTime.UtcNow;
            
            // Update metrics
            project.Metrics.PostCount = postCount;
            project.Metrics.LastPostGenerationAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Complete job
            await CompleteJob(job, postCount);
            
            _logger.LogInformation("Generated {Count} posts for project {ProjectId}", postCount, projectId);
            
            // Log event
            await LogProjectEvent(projectId, "posts_generated", $"Generated {postCount} posts from {insights.Count} insights");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating posts for project {ProjectId}", projectId);
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
        var projectEvent = new ProjectEvent
        {
            ProjectId = projectId,
            EventType = eventType,
            Description = description,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectEvents.Add(projectEvent);
        await _context.SaveChangesAsync();
    }
}