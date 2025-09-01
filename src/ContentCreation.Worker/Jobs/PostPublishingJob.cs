using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Worker.Jobs;

public class PostPublishingJob
{
    private readonly ILogger<PostPublishingJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly ILinkedInService _linkedInService;
    private readonly ITwitterService _twitterService;

    public PostPublishingJob(
        ILogger<PostPublishingJob> logger,
        ApplicationDbContext context,
        ILinkedInService linkedInService,
        ITwitterService twitterService)
    {
        _logger = logger;
        _context = context;
        _linkedInService = linkedInService;
        _twitterService = twitterService;
    }

    [DisableConcurrentExecution(timeoutInSeconds: 60)]
    public async Task PublishScheduledPosts()
    {
        _logger.LogInformation("Checking for scheduled posts to publish");
        
        // Get posts that are due for publishing
        var duePost = await _context.ProjectScheduledPosts
            .Include(sp => sp.Post)
            .Include(sp => sp.Project)
            .Where(sp => sp.Status == "pending")
            .Where(sp => sp.ScheduledTime <= DateTime.UtcNow)
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
        
        if (!duePost.Any())
        {
            _logger.LogDebug("No scheduled posts due for publishing");
            return;
        }
        
        _logger.LogInformation("Found {Count} posts to publish", duePost.Count);
        
        foreach (var scheduledPost in duePost)
        {
            await PublishPost(scheduledPost);
        }
    }

    [Queue("critical")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task PublishPost(ProjectScheduledPost scheduledPost)
    {
        _logger.LogInformation("Publishing post {PostId} to {Platform}", 
            scheduledPost.PostId, scheduledPost.Platform);
        
        try
        {
            scheduledPost.LastAttempt = DateTime.UtcNow;
            
            string? externalId = null;
            
            switch (scheduledPost.Platform.ToLower())
            {
                case "linkedin":
                    externalId = await _linkedInService.PublishPostAsync(
                        scheduledPost.Content,
                        scheduledPost.Post?.MediaUrls);
                    break;
                    
                case "twitter":
                case "x":
                    externalId = await _twitterService.PublishPostAsync(
                        scheduledPost.Content,
                        scheduledPost.Post?.MediaUrls);
                    break;
                    
                default:
                    throw new NotSupportedException($"Platform {scheduledPost.Platform} is not supported");
            }
            
            // Update scheduled post status
            scheduledPost.Status = "published";
            scheduledPost.ExternalPostId = externalId;
            scheduledPost.UpdatedAt = DateTime.UtcNow;
            
            // Update post status
            if (scheduledPost.Post != null)
            {
                scheduledPost.Post.Status = "published";
                scheduledPost.Post.PublishedAt = DateTime.UtcNow;
                scheduledPost.Post.UpdatedAt = DateTime.UtcNow;
            }
            
            // Update project metrics
            var project = scheduledPost.Project;
            if (project != null)
            {
                project.Metrics.PublishedPostCount++;
                project.Metrics.LastPublishedAt = DateTime.UtcNow;
                
                // Check if all posts are published
                var hasPendingPosts = await _context.ProjectScheduledPosts
                    .AnyAsync(sp => sp.ProjectId == project.Id && sp.Status == "pending");
                
                if (!hasPendingPosts)
                {
                    project.CurrentStage = "published";
                }
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Successfully published post {PostId} to {Platform} with external ID {ExternalId}",
                scheduledPost.PostId, scheduledPost.Platform, externalId);
            
            // Log event
            await LogProjectEvent(
                scheduledPost.ProjectId,
                "post_published",
                $"Published post to {scheduledPost.Platform}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing post {PostId} to {Platform}",
                scheduledPost.PostId, scheduledPost.Platform);
            
            scheduledPost.RetryCount++;
            scheduledPost.ErrorMessage = ex.Message;
            scheduledPost.UpdatedAt = DateTime.UtcNow;
            
            if (scheduledPost.RetryCount >= 3)
            {
                scheduledPost.Status = "failed";
            }
            
            await _context.SaveChangesAsync();
            
            throw;
        }
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