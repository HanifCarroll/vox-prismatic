using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Hangfire;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class PostPublishingJob
{
    private readonly ILogger<PostPublishingJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly ISocialPostPublisher _publishingService;
    private readonly IConfiguration _configuration;
    private readonly SemaphoreSlim _publishSemaphore;
    private readonly int _maxConcurrentPublishes;

    public PostPublishingJob(
        ILogger<PostPublishingJob> logger,
        ApplicationDbContext context,
        ISocialPostPublisher publishingService,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _publishingService = publishingService;
        _configuration = configuration;
        _maxConcurrentPublishes = configuration.GetValue<int>("Publishing:MaxConcurrent", 5);
        _publishSemaphore = new SemaphoreSlim(_maxConcurrentPublishes, _maxConcurrentPublishes);
    }

    [DisableConcurrentExecution(timeoutInSeconds: 60)]
    public async Task PublishScheduledPosts()
    {
        _logger.LogInformation("Checking for scheduled posts to publish");
        
        var window = TimeSpan.FromMinutes(5);
        var now = DateTime.UtcNow;
        
        var duePosts = await _context.ProjectScheduledPosts
            .Include(sp => sp.Post)
            .Include(sp => sp.Project)
            .Where(sp => sp.Status == "pending")
            .Where(sp => sp.ScheduledTime <= now.Add(window))
            .OrderBy(sp => sp.ScheduledTime)
            .ThenBy(sp => sp.Platform)
            .Take(20)
            .ToListAsync();
        
        if (!duePosts.Any())
        {
            _logger.LogDebug("No scheduled posts due for publishing");
            return;
        }
        
        _logger.LogInformation("Found {Count} posts to publish", duePosts.Count);
        
        var groupedByTime = duePosts
            .GroupBy(sp => new DateTime(
                sp.ScheduledTime.Year,
                sp.ScheduledTime.Month,
                sp.ScheduledTime.Day,
                sp.ScheduledTime.Hour,
                sp.ScheduledTime.Minute / 5 * 5,
                0))
            .OrderBy(g => g.Key);
        
        foreach (var timeGroup in groupedByTime)
        {
            if (timeGroup.Key > now)
            {
                var delay = timeGroup.Key - now;
                _logger.LogInformation("Waiting {Delay} seconds before publishing batch", delay.TotalSeconds);
                await Task.Delay(delay);
            }
            
            var tasks = timeGroup.Select(async scheduledPost =>
            {
                await _publishSemaphore.WaitAsync();
                try
                {
                    await PublishPost(scheduledPost);
                }
                finally
                {
                    _publishSemaphore.Release();
                }
            });
            
            await Task.WhenAll(tasks);
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
            scheduledPost.RetryCount++;
            
            var platformContents = await OptimizeContentForPlatform(
                scheduledPost.Content, 
                scheduledPost.Platform);
            
            // Publish using the Post object
            string? externalId = null;
            if (scheduledPost.Post != null)
            {
                externalId = await _publishingService.PublishToSocialMedia(
                    scheduledPost.Post,
                    scheduledPost.Platform);
            }
            
            await MarkPostAsPublished(scheduledPost, externalId);
            
            _logger.LogInformation("Successfully published post {PostId} to {Platform} with external ID {ExternalId}",
                scheduledPost.PostId, scheduledPost.Platform, externalId);
            
            await LogProjectEvent(
                scheduledPost.ProjectId,
                "post_published",
                $"Published post to {scheduledPost.Platform}",
                new { Platform = scheduledPost.Platform, ExternalId = externalId });
            
            await CheckAndUpdateProjectStatus(scheduledPost.ProjectId);
        }
        catch (Exception ex)
        {
            await HandlePublishingError(scheduledPost, ex);
            throw;
        }
    }

    [Queue("default")]
    public async Task PublishMultiPlatformPost(string postId, List<string> platforms)
    {
        _logger.LogInformation("Publishing post {PostId} to multiple platforms: {Platforms}", 
            postId, string.Join(", ", platforms));
        
        var post = await _context.Posts
            .Include(p => p.Project)
            .FirstOrDefaultAsync(p => p.Id == postId);
        
        if (post == null)
        {
            _logger.LogError("Post {PostId} not found", postId);
            return;
        }
        
        var platformContents = new Dictionary<string, string>();
        
        foreach (var platform in platforms)
        {
            var optimizedContent = await OptimizeContentForPlatform(post.Content, platform);
            platformContents[platform] = optimizedContent;
        }
        
        // Publish to multiple platforms
        var result = await _publishingService.PublishMultiPlatform(
            post, 
            platforms);
        
        foreach (var platformResult in result)
        {
            if (platformResult.Value.Success)
            {
                var scheduledPost = new ProjectScheduledPost
                {
                    ProjectId = post.ProjectId,
                    PostId = postId,
                    Platform = platformResult.Key,
                    Content = platformContents[platformResult.Key],
                    ScheduledTime = DateTime.UtcNow,
                    Status = "published",
                    ExternalPostId = platformResult.Value.ExternalId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _context.ProjectScheduledPosts.Add(scheduledPost);
            }
        }
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Multi-platform publishing completed for {Count} platforms",
            result.Count);
    }

    [Queue("low")]
    public async Task RetryFailedPosts()
    {
        _logger.LogInformation("Checking for failed posts to retry");
        
        var failedPosts = await _context.ProjectScheduledPosts
            .Include(sp => sp.Post)
            .Include(sp => sp.Project)
            .Where(sp => sp.Status == "failed")
            .Where(sp => sp.RetryCount < 5)
            .Where(sp => sp.LastAttempt < DateTime.UtcNow.AddHours(-1))
            .OrderBy(sp => sp.LastAttempt)
            .Take(10)
            .ToListAsync();
        
        if (!failedPosts.Any())
        {
            _logger.LogDebug("No failed posts to retry");
            return;
        }
        
        foreach (var scheduledPost in failedPosts)
        {
            scheduledPost.Status = "pending";
            scheduledPost.ScheduledTime = DateTime.UtcNow.AddMinutes(5);
            scheduledPost.ErrorMessage = null;
        }
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Rescheduled {Count} failed posts for retry", failedPosts.Count);
    }

    private Task<string> OptimizeContentForPlatform(string content, string platform)
    {
        var result = platform.ToLower() switch
        {
            "linkedin" => OptimizeForLinkedIn(content),
            "twitter" or "x" => OptimizeForTwitter(content),
            _ => content
        };
        return Task.FromResult(result);
    }

    private string OptimizeForLinkedIn(string content)
    {
        if (content.Length > 3000)
        {
            content = content.Substring(0, 2997) + "...";
        }
        
        if (!content.Contains("#"))
        {
            content += "\n\n#ContentCreation #SocialMedia #Marketing";
        }
        
        return content;
    }

    private string OptimizeForTwitter(string content)
    {
        if (content.Length > 280)
        {
            var lastSpace = content.LastIndexOf(' ', 277);
            if (lastSpace > 0)
            {
                content = content.Substring(0, lastSpace) + "...";
            }
            else
            {
                content = content.Substring(0, 277) + "...";
            }
        }
        
        return content;
    }

    private async Task MarkPostAsPublished(ProjectScheduledPost scheduledPost, string? externalId)
    {
        scheduledPost.Status = "published";
        scheduledPost.ExternalPostId = externalId;
        scheduledPost.PublishedAt = DateTime.UtcNow;
        scheduledPost.UpdatedAt = DateTime.UtcNow;
        scheduledPost.ErrorMessage = null;
        
        if (scheduledPost.Post != null)
        {
            scheduledPost.Post.Status = "published";
            scheduledPost.Post.PublishedAt = DateTime.UtcNow;
            scheduledPost.Post.UpdatedAt = DateTime.UtcNow;
            
            var publishingInfo = new
            {
                Platform = scheduledPost.Platform,
                ExternalId = externalId,
                PublishedAt = DateTime.UtcNow
            };
            
            if (scheduledPost.Post.Metadata == null)
            {
                scheduledPost.Post.Metadata = new Dictionary<string, object>
                {
                    { "Publishing", new[] { publishingInfo } }
                };
            }
            else
            {
                if (scheduledPost.Post.Metadata.TryGetValue("Publishing", out var publishing))
                {
                    var publishingList = publishing as List<object> ?? new List<object> { publishing };
                    publishingList.Add(publishingInfo);
                    scheduledPost.Post.Metadata["Publishing"] = publishingList;
                }
                else
                {
                    scheduledPost.Post.Metadata["Publishing"] = new[] { publishingInfo };
                }
            }
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task HandlePublishingError(ProjectScheduledPost scheduledPost, Exception ex)
    {
        _logger.LogError(ex, "Error publishing post {PostId} to {Platform}",
            scheduledPost.PostId, scheduledPost.Platform);
        
        scheduledPost.ErrorMessage = ex.Message;
        scheduledPost.UpdatedAt = DateTime.UtcNow;
        
        if (scheduledPost.RetryCount >= 3)
        {
            scheduledPost.Status = "failed";
            
            await LogProjectEvent(
                scheduledPost.ProjectId,
                "post_publish_failed",
                $"Failed to publish post to {scheduledPost.Platform} after {scheduledPost.RetryCount} attempts",
                new { Platform = scheduledPost.Platform, Error = ex.Message });
        }
        else
        {
            scheduledPost.Status = "retry";
            scheduledPost.ScheduledTime = DateTime.UtcNow.AddMinutes(Math.Pow(5, scheduledPost.RetryCount));
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CheckAndUpdateProjectStatus(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        
        if (project == null) return;
        
        var allScheduledPosts = project.ScheduledPosts;
        var publishedCount = allScheduledPosts.Count(sp => sp.Status == "published");
        var pendingCount = allScheduledPosts.Count(sp => sp.Status == "pending" || sp.Status == "retry");
        var failedCount = allScheduledPosts.Count(sp => sp.Status == "failed");
        
        project.Metrics.PublishedPostCount = publishedCount;
        project.Metrics.LastPublishedAt = DateTime.UtcNow;
        
        if (pendingCount == 0)
        {
            if (failedCount > 0)
            {
                project.CurrentStage = "partially_published";
            }
            else if (publishedCount > 0)
            {
                project.CurrentStage = "published";
            }
        }
        
        project.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private async Task LogProjectEvent(string projectId, string eventType, string description, object? metadata = null)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = eventType,
            ActivityName = description,
            Description = description,
            Metadata = metadata != null ? JsonSerializer.Serialize(metadata) : null,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
}