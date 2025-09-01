using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace ContentCreation.Infrastructure.Services;

public class PublishingService : IPublishingService
{
    private readonly ILogger<PublishingService> _logger;
    private readonly ILinkedInService _linkedInService;
    private readonly ITwitterService _twitterService;
    private readonly ApplicationDbContext _context;
    private readonly ConcurrentDictionary<string, PublishingQueueItem> _publishingQueue;
    private readonly SemaphoreSlim _publishSemaphore;

    public PublishingService(
        ILogger<PublishingService> logger,
        ILinkedInService linkedInService,
        ITwitterService twitterService,
        ApplicationDbContext context)
    {
        _logger = logger;
        _linkedInService = linkedInService;
        _twitterService = twitterService;
        _context = context;
        _publishingQueue = new ConcurrentDictionary<string, PublishingQueueItem>();
        _publishSemaphore = new SemaphoreSlim(3, 3);
    }

    public async Task<string> PublishToSocialMedia(string platform, string content, List<string>? mediaUrls = null)
    {
        await _publishSemaphore.WaitAsync();
        try
        {
            _logger.LogInformation("Publishing to {Platform}", platform);
            
            var result = platform.ToLower() switch
            {
                "linkedin" => await PublishWithRetryAsync(
                    () => _linkedInService.PublishPostAsync(content, mediaUrls),
                    platform, 3),
                "twitter" or "x" => await PublishWithRetryAsync(
                    () => _twitterService.PublishPostAsync(content, mediaUrls),
                    platform, 3),
                _ => throw new NotSupportedException($"Platform {platform} is not supported")
            };
            
            await LogPublishingMetrics(platform, true);
            
            return result;
        }
        catch (Exception ex)
        {
            await LogPublishingMetrics(platform, false, ex.Message);
            throw;
        }
        finally
        {
            _publishSemaphore.Release();
        }
    }

    public async Task<PublishingResult> PublishMultiPlatform(string postId, Dictionary<string, string> platformContents, List<string>? mediaUrls = null)
    {
        _logger.LogInformation("Publishing post {PostId} to multiple platforms", postId);
        
        var results = new PublishingResult
        {
            PostId = postId,
            PlatformResults = new Dictionary<string, PlatformPublishResult>()
        };
        
        var tasks = platformContents.Select(async kvp =>
        {
            var platform = kvp.Key;
            var content = kvp.Value;
            
            try
            {
                var externalId = await PublishToSocialMedia(platform, content, mediaUrls);
                
                return new PlatformPublishResult
                {
                    Platform = platform,
                    Success = true,
                    ExternalId = externalId,
                    PublishedAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish to {Platform}", platform);
                
                return new PlatformPublishResult
                {
                    Platform = platform,
                    Success = false,
                    ErrorMessage = ex.Message,
                    FailedAt = DateTime.UtcNow
                };
            }
        });
        
        var platformResults = await Task.WhenAll(tasks);
        
        foreach (var result in platformResults)
        {
            results.PlatformResults[result.Platform] = result;
        }
        
        results.SuccessCount = results.PlatformResults.Count(r => r.Value.Success);
        results.FailureCount = results.PlatformResults.Count(r => !r.Value.Success);
        results.CompletedAt = DateTime.UtcNow;
        
        await UpdatePostStatus(postId, results);
        
        return results;
    }

    public async Task<bool> ValidatePlatformCredentials(string platform)
    {
        _logger.LogInformation("Validating credentials for {Platform}", platform);
        
        return platform.ToLower() switch
        {
            "linkedin" => await _linkedInService.ValidateCredentialsAsync(),
            "twitter" or "x" => await _twitterService.ValidateCredentialsAsync(),
            _ => false
        };
    }

    public async Task<Dictionary<string, bool>> ValidateAllPlatformCredentials()
    {
        var platforms = new[] { "linkedin", "twitter" };
        var results = new Dictionary<string, bool>();
        
        foreach (var platform in platforms)
        {
            results[platform] = await ValidatePlatformCredentials(platform);
        }
        
        return results;
    }

    public async Task<QueueStatus> GetQueueStatus()
    {
        var pendingPosts = await _context.ProjectScheduledPosts
            .Where(sp => sp.Status == "pending")
            .GroupBy(sp => sp.Platform)
            .Select(g => new
            {
                Platform = g.Key,
                Count = g.Count()
            })
            .ToListAsync();
        
        return new QueueStatus
        {
            TotalPending = pendingPosts.Sum(p => p.Count),
            PlatformCounts = pendingPosts.ToDictionary(p => p.Platform, p => p.Count),
            ActivePublishing = _publishingQueue.Count,
            QueueItems = _publishingQueue.Values.ToList()
        };
    }

    public async Task<bool> CancelScheduledPost(string scheduledPostId)
    {
        var scheduledPost = await _context.ProjectScheduledPosts
            .FirstOrDefaultAsync(sp => sp.Id == scheduledPostId);
        
        if (scheduledPost == null)
        {
            return false;
        }
        
        if (scheduledPost.Status != "pending")
        {
            _logger.LogWarning("Cannot cancel scheduled post {Id} with status {Status}", 
                scheduledPostId, scheduledPost.Status);
            return false;
        }
        
        scheduledPost.Status = "cancelled";
        scheduledPost.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Cancelled scheduled post {Id}", scheduledPostId);
        return true;
    }

    public async Task<List<ProjectScheduledPost>> GetScheduledPostsForTimeRange(DateTime start, DateTime end)
    {
        return await _context.ProjectScheduledPosts
            .Include(sp => sp.Post)
            .Include(sp => sp.Project)
            .Where(sp => sp.Status == "pending")
            .Where(sp => sp.ScheduledTime >= start && sp.ScheduledTime <= end)
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
    }

    private async Task<string> PublishWithRetryAsync(
        Func<Task<string>> publishFunc, 
        string platform, 
        int maxRetries)
    {
        int attempt = 0;
        Exception? lastException = null;
        
        while (attempt < maxRetries)
        {
            try
            {
                attempt++;
                _logger.LogInformation("Publishing to {Platform}, attempt {Attempt}/{MaxRetries}", 
                    platform, attempt, maxRetries);
                    
                return await publishFunc();
            }
            catch (Exception ex)
            {
                lastException = ex;
                _logger.LogWarning(ex, "Failed to publish to {Platform} on attempt {Attempt}", 
                    platform, attempt);
                
                if (attempt < maxRetries)
                {
                    var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    _logger.LogInformation("Retrying in {Delay} seconds", delay.TotalSeconds);
                    await Task.Delay(delay);
                }
            }
        }
        
        throw new Exception($"Failed to publish to {platform} after {maxRetries} attempts", lastException);
    }

    private async Task UpdatePostStatus(string postId, PublishingResult result)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        
        if (post != null)
        {
            if (result.SuccessCount > 0)
            {
                post.Status = result.FailureCount > 0 ? "partially_published" : "published";
                post.PublishedAt = DateTime.UtcNow;
            }
            else
            {
                post.Status = "failed";
            }
            
            post.UpdatedAt = DateTime.UtcNow;
            
            var publishingMetadata = new
            {
                Platforms = result.PlatformResults,
                CompletedAt = result.CompletedAt,
                SuccessCount = result.SuccessCount,
                FailureCount = result.FailureCount
            };
            
            post.Metadata = System.Text.Json.JsonSerializer.Serialize(publishingMetadata);
            
            await _context.SaveChangesAsync();
        }
    }

    private async Task LogPublishingMetrics(string platform, bool success, string? errorMessage = null)
    {
        var analyticsEvent = new AnalyticsEvent
        {
            EventType = "post_published",
            EventData = System.Text.Json.JsonSerializer.Serialize(new
            {
                Platform = platform,
                Success = success,
                ErrorMessage = errorMessage,
                Timestamp = DateTime.UtcNow
            }),
            OccurredAt = DateTime.UtcNow
        };
        
        _context.AnalyticsEvents.Add(analyticsEvent);
        await _context.SaveChangesAsync();
    }
}

public class PublishingResult
{
    public string PostId { get; set; } = string.Empty;
    public Dictionary<string, PlatformPublishResult> PlatformResults { get; set; } = new();
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class PlatformPublishResult
{
    public string Platform { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ExternalId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? FailedAt { get; set; }
}

public class QueueStatus
{
    public int TotalPending { get; set; }
    public Dictionary<string, int> PlatformCounts { get; set; } = new();
    public int ActivePublishing { get; set; }
    public List<PublishingQueueItem> QueueItems { get; set; } = new();
}

public class PublishingQueueItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime QueuedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "queued";
}