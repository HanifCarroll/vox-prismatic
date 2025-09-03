using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Hangfire;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using RestSharp;
using System.Net;
using MediatR;
using ContentCreation.Api.Features.Publishing;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class PostPublishingJob
{
    private readonly ILogger<PostPublishingJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IMediator _mediator;
    private readonly SemaphoreSlim _publishSemaphore;
    private readonly int _maxConcurrentPublishes;

    public PostPublishingJob(
        ILogger<PostPublishingJob> logger,
        ApplicationDbContext context,
        IConfiguration configuration,
        IMediator mediator)
    {
        _logger = logger;
        _context = context;
        _configuration = configuration;
        _mediator = mediator;
        _maxConcurrentPublishes = configuration.GetValue<int>("Publishing:MaxConcurrent", 5);
        _publishSemaphore = new SemaphoreSlim(_maxConcurrentPublishes, _maxConcurrentPublishes);
    }

    [DisableConcurrentExecution(timeoutInSeconds: 60)]
    public async Task PublishScheduledPosts()
    {
        _logger.LogInformation("Checking for scheduled posts to publish");
        
        var window = TimeSpan.FromMinutes(5);
        var now = DateTime.UtcNow;
        
        var duePosts = await _context.ScheduledPosts
            .Include(sp => sp.Post)
            .Include(sp => sp.Project)
            .Where(sp => sp.Status == ScheduledPostStatus.Pending)
            .Where(sp => sp.ScheduledTime <= now.Add(window))
            .Where(sp => sp.Platform == SocialPlatform.LinkedIn.ToApiString())
            .OrderBy(sp => sp.ScheduledTime)
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
    public async Task PublishPost(ScheduledPost scheduledPost)
    {
        _logger.LogInformation("Publishing post {PostId} to LinkedIn", 
            scheduledPost.PostId);
        
        try
        {
            // Use domain method to track attempt
            scheduledPost.IncrementRetryCount();
            
            var optimizedContent = OptimizeForLinkedIn(scheduledPost.Content);
            
            // Publish using MediatR handler for LinkedIn
            string? externalId = null;
            if (scheduledPost.Post != null)
            {
                var publishResult = await _mediator.Send(new PublishToLinkedIn.Request(
                    ProjectId: scheduledPost.ProjectId,
                    PostId: scheduledPost.PostId,
                    UserId: scheduledPost.Project?.UserId ?? Guid.Empty
                ));
                
                if (publishResult.IsSuccess)
                {
                    externalId = publishResult.PublishedUrl;
                }
                else
                {
                    throw new Exception($"Failed to publish to LinkedIn: {publishResult.Error}");
                }
            }
            
            await MarkPostAsPublished(scheduledPost, externalId);
            
            _logger.LogInformation("Successfully published post {PostId} to LinkedIn with external ID {ExternalId}",
                scheduledPost.PostId, externalId);
            
            await LogProjectEvent(
                scheduledPost.ProjectId.ToString(),
                "post_published",
                "Published post to LinkedIn",
                new { Platform = SocialPlatform.LinkedIn.ToApiString(), ExternalId = externalId });
            
            await CheckAndUpdateProjectStatus(scheduledPost.ProjectId.ToString());
        }
        catch (Exception ex)
        {
            await HandlePublishingError(scheduledPost, ex);
            throw;
        }
    }


    [Queue("low")]
    public async Task RetryFailedPosts()
    {
        _logger.LogInformation("Checking for failed posts to retry");
        
        var failedPosts = await _context.ScheduledPosts
            .Include(sp => sp.Post)
            .Include(sp => sp.Project)
            .Where(sp => sp.Status == ScheduledPostStatus.Failed)
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
            scheduledPost.Reschedule(DateTime.UtcNow.AddMinutes(5));
            scheduledPost.UpdateStatus(ScheduledPostStatus.Pending);
        }
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Rescheduled {Count} failed posts for retry", failedPosts.Count);
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


    private async Task MarkPostAsPublished(ScheduledPost scheduledPost, string? externalId)
    {
        scheduledPost.MarkAsPublished(externalId, DateTime.UtcNow);
        
        if (scheduledPost.Post != null)
        {
            scheduledPost.Post.MarkAsPublished();
            
            var publishingInfo = new
            {
                Platform = SocialPlatform.LinkedIn.ToApiString(),
                ExternalId = externalId,
                PublishedAt = DateTime.UtcNow
            };
            
            var metadata = scheduledPost.Post.Metadata ?? new Dictionary<string, object>();
            
            if (metadata.TryGetValue("Publishing", out var publishing))
            {
                var publishingList = publishing as List<object> ?? new List<object> { publishing };
                publishingList.Add(publishingInfo);
                metadata["Publishing"] = publishingList;
            }
            else
            {
                metadata["Publishing"] = new[] { publishingInfo };
            }
            
            scheduledPost.Post.SetMetadata(metadata);
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task HandlePublishingError(ScheduledPost scheduledPost, Exception ex)
    {
        _logger.LogError(ex, "Error publishing post {PostId} to LinkedIn",
            scheduledPost.PostId);
        
        if (scheduledPost.RetryCount >= 3)
        {
            scheduledPost.MarkAsFailed(ex.Message);
            
            await LogProjectEvent(
                scheduledPost.ProjectId.ToString(),
                "post_publish_failed",
                $"Failed to publish post to LinkedIn after {scheduledPost.RetryCount} attempts",
                new { Platform = SocialPlatform.LinkedIn.ToApiString(), Error = ex.Message });
        }
        else
        {
            var nextAttempt = DateTime.UtcNow.AddMinutes(Math.Pow(5, scheduledPost.RetryCount));
            scheduledPost.Reschedule(nextAttempt);
            scheduledPost.UpdateStatus(ScheduledPostStatus.Retry);
            scheduledPost.SetError(ex.Message);
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CheckAndUpdateProjectStatus(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == Guid.Parse(projectId));
        
        if (project == null) return;
        
        var allScheduledPosts = project.ScheduledPosts;
        var publishedCount = allScheduledPosts.Count(sp => sp.Status == ScheduledPostStatus.Published);
        var pendingCount = allScheduledPosts.Count(sp => sp.Status == ScheduledPostStatus.Pending);
        var failedCount = allScheduledPosts.Count(sp => sp.Status == ScheduledPostStatus.Failed);
        
        project.Metrics.PublishedPostCount = publishedCount;
        project.Metrics.LastPublishedAt = DateTime.UtcNow;
        
        if (pendingCount == 0)
        {
            if (failedCount > 0)
            {
                // Keep current stage for partial failures - don't transition
                // The project remains in Publishing stage until all posts succeed
            }
            else if (publishedCount > 0)
            {
                // All posts published successfully - transition to Published
                project.CompletePublishing();
            }
        }
        await _context.SaveChangesAsync();
    }

    private async Task LogProjectEvent(string projectId, string eventType, string description, object? metadata = null)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = Guid.Parse(projectId),
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