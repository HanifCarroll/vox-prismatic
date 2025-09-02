using ContentCreation.Core.DTOs.Publishing;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Infrastructure.Services.Publishing;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class PublishingService : ISocialPostPublisher, IPublishingService
{
    private readonly ApplicationDbContext _context;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PublishingService> _logger;
    private readonly Dictionary<string, IPlatformAdapter> _adapters;
    
    public PublishingService(
        ApplicationDbContext context,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<PublishingService> logger)
    {
        _context = context;
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
        _adapters = new Dictionary<string, IPlatformAdapter>();
        InitializeAdapters();
    }
    
    private void InitializeAdapters()
    {
        using var scope = _serviceProvider.CreateScope();
        
        var linkedInAdapter = scope.ServiceProvider.GetService<LinkedInAdapter>();
        if (linkedInAdapter != null)
            _adapters["LinkedIn"] = linkedInAdapter;
    }

    // OAuth & Authentication
    public Task<string> GetAuthorizationUrlAsync(string platform, string? state = null)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            throw new ArgumentException($"Platform {platform} not supported");
        
        return Task.FromResult(adapter.GetAuthorizationUrl(state));
    }
    
    public async Task<PlatformTokenDto> ExchangeAuthCodeAsync(PlatformAuthDto authDto)
    {
        if (!_adapters.TryGetValue(authDto.Platform, out var adapter))
            throw new ArgumentException($"Platform {authDto.Platform} not supported");
        
        var token = await adapter.ExchangeAuthCodeAsync(authDto.Code, authDto.RedirectUri);
        
        // Store tokens in database
        var platformAuth = await _context.PlatformAuths
            .FirstOrDefaultAsync(pa => pa.Platform == authDto.Platform);
        
        if (platformAuth == null)
        {
            platformAuth = new PlatformAuth
            {
                Id = Guid.NewGuid(),
                Platform = authDto.Platform
            };
            _context.PlatformAuths.Add(platformAuth);
        }
        
        platformAuth.AccessToken = token.AccessToken;
        platformAuth.RefreshToken = token.RefreshToken;
        platformAuth.ExpiresAt = token.ExpiresAt;
        platformAuth.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return token;
    }
    
    public async Task<bool> RefreshTokensAsync(string platform)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return false;
        
        return await adapter.RefreshTokenAsync();
    }
    
    public async Task<bool> RevokeAccessAsync(string platform)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return false;
        
        var result = await adapter.RevokeAccessAsync();
        
        if (result)
        {
            var platformAuth = await _context.PlatformAuths
                .FirstOrDefaultAsync(pa => pa.Platform == platform);
            
            if (platformAuth != null)
            {
                _context.PlatformAuths.Remove(platformAuth);
                await _context.SaveChangesAsync();
            }
        }
        
        return result;
    }
    
    public async Task<PlatformProfileDto?> GetProfileAsync(string platform)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return null;
        
        return await adapter.GetProfileAsync();
    }
    
    public async Task<List<PlatformProfileDto>> GetConnectedProfilesAsync()
    {
        var profiles = new List<PlatformProfileDto>();
        
        foreach (var adapter in _adapters.Values)
        {
            var profile = await adapter.GetProfileAsync();
            if (profile != null)
                profiles.Add(profile);
        }
        
        return profiles;
    }
    
    public async Task<bool> TestConnectionAsync(string platform)
    {
        return await TestConnectionAsync(platform, CancellationToken.None);
    }
    
    public async Task<bool> TestConnectionAsync(string platform, CancellationToken cancellationToken)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return false;
        
        return await adapter.TestConnectionAsync();
    }
    
    // Direct Publishing
    public async Task<PublishResultDto> PublishNowAsync(PublishNowDto dto)
    {
        var post = await _context.Posts.FindAsync(dto.PostId.ToString());
        if (post == null)
            throw new ArgumentException($"Post {dto.PostId} not found");
        
        var results = new List<PlatformResultDto>();
        
        foreach (var platform in dto.Platforms)
        {
            if (!_adapters.TryGetValue(platform, out var adapter))
            {
                results.Add(new PlatformResultDto
                {
                    Platform = platform,
                    Success = false,
                    Error = $"Platform {platform} not supported"
                });
                continue;
            }
            
            var result = await adapter.PublishAsync(post);
            results.Add(result);
            
            // Log analytics
            await LogPublishingAnalytics(Guid.Parse(post.Id), platform, result.Success);
        }
        
        // Update post status
        var successCount = results.Count(r => r.Success);
        if (successCount > 0)
        {
            post.Status = successCount == results.Count ? "Published" : "PartiallyPublished";
            post.PublishedAt = DateTime.UtcNow;
        }
        else
        {
            post.Status = "Failed";
        }
        
        await _context.SaveChangesAsync();
        
        return new PublishResultDto
        {
            PostId = dto.PostId,
            PlatformResults = results,
            PublishedAt = DateTime.UtcNow
        };
    }
    
    public async Task<PublishResultDto> PublishToLinkedInAsync(Guid postId)
    {
        return await PublishToPlatformAsync(postId, "LinkedIn");
    }
    
    public async Task<PublishResultDto> PublishToPlatformAsync(Guid postId, string platform)
    {
        return await PublishNowAsync(new PublishNowDto
        {
            PostId = postId,
            Platforms = new List<string> { platform }
        });
    }

    // Scheduled Publishing
    public async Task<ScheduledPostDto> SchedulePostAsync(SchedulePostDto dto)
    {
        var post = await _context.Posts.FindAsync(dto.PostId.ToString());
        if (post == null)
            throw new ArgumentException($"Post {dto.PostId} not found");
        
        var scheduledPost = new ScheduledPost
        {
            Id = Guid.NewGuid(),
            PostId = dto.PostId,
            ProjectId = Guid.Parse(post.ProjectId),
            Platforms = dto.Platforms,
            ScheduledFor = dto.ScheduledTime,
            TimeZone = dto.TimeZone ?? "UTC",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ScheduledPosts.Add(scheduledPost);
        await _context.SaveChangesAsync();
        
        // Schedule Hangfire job
        var jobId = BackgroundJob.Schedule(
            () => ProcessScheduledPostAsync(scheduledPost.Id),
            dto.ScheduledTime - DateTime.UtcNow);
        
        scheduledPost.JobId = jobId;
        await _context.SaveChangesAsync();
        
        return MapToScheduledPostDto(scheduledPost);
    }
    
    public async Task<List<ScheduledPostDto>> BulkScheduleAsync(BulkScheduleDto dto)
    {
        var scheduledPosts = new List<ScheduledPostDto>();
        var scheduleTime = dto.StartTime;
        
        foreach (var postId in dto.PostIds)
        {
            var scheduled = await SchedulePostAsync(new SchedulePostDto
            {
                PostId = postId,
                Platforms = dto.Platforms,
                PublishAt = scheduleTime,
                TimeZone = dto.TimeZone
            });
            
            scheduledPosts.Add(scheduled);
            scheduleTime = scheduleTime.Add(dto.Interval);
        }
        
        return scheduledPosts;
    }
    
    public async Task<List<ScheduledPostDto>> GetScheduledPostsAsync(DateTime? from = null, DateTime? to = null)
    {
        var query = _context.ScheduledPosts
            .Include(sp => sp.Post)
            .Where(sp => sp.Status == "Pending");
        
        if (from.HasValue)
            query = query.Where(sp => sp.ScheduledFor >= from.Value);
        
        if (to.HasValue)
            query = query.Where(sp => sp.ScheduledFor <= to.Value);
        
        var posts = await query
            .OrderBy(sp => sp.ScheduledFor)
            .ToListAsync();
        
        return posts.Select(MapToScheduledPostDto).ToList();
    }
    
    public async Task<ScheduledPostDto?> GetScheduledPostAsync(Guid scheduledPostId)
    {
        var post = await _context.ScheduledPosts
            .Include(sp => sp.Post)
            .FirstOrDefaultAsync(sp => sp.Id == scheduledPostId);
        
        return post != null ? MapToScheduledPostDto(post) : null;
    }
    
    public async Task<bool> UpdateScheduledPostAsync(UpdateScheduledPostDto dto)
    {
        var scheduledPost = await _context.ScheduledPosts.FindAsync(dto.ScheduledPostId);
        if (scheduledPost == null || scheduledPost.Status != "Pending")
            return false;
        
        if (dto.NewScheduledTime.HasValue)
        {
            scheduledPost.ScheduledFor = dto.NewScheduledTime.Value;
            
            // Reschedule Hangfire job
            if (!string.IsNullOrEmpty(scheduledPost.JobId))
            {
                BackgroundJob.Delete(scheduledPost.JobId);
                var jobId = BackgroundJob.Schedule(
                    () => ProcessScheduledPostAsync(scheduledPost.Id),
                    dto.NewScheduledTime.Value - DateTime.UtcNow);
                scheduledPost.JobId = jobId;
            }
        }
        
        if (dto.Platforms != null)
            scheduledPost.Platforms = dto.Platforms;
        
        scheduledPost.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<bool> CancelScheduledPostAsync(CancelScheduledPostDto dto)
    {
        var scheduledPost = await _context.ScheduledPosts.FindAsync(dto.ScheduledPostId);
        if (scheduledPost == null || scheduledPost.Status != "Pending")
            return false;
        
        scheduledPost.Status = "Cancelled";
        scheduledPost.CancelledAt = DateTime.UtcNow;
        scheduledPost.CancelReason = dto.Reason;
        
        // Cancel Hangfire job
        if (!string.IsNullOrEmpty(scheduledPost.JobId))
            BackgroundJob.Delete(scheduledPost.JobId);
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Cancelled scheduled post {Id}", dto.ScheduledPostId);
        return true;
    }
    
    public async Task<int> CancelAllScheduledPostsAsync(Guid? projectId = null)
    {
        var query = _context.ScheduledPosts.Where(sp => sp.Status == "Pending");
        
        if (projectId.HasValue)
        {
            var postIds = await _context.Posts
                .Where(p => p.ProjectId == projectId.Value.ToString())
                .Select(p => Guid.Parse(p.Id))
                .ToListAsync();
            
            query = query.Where(sp => postIds.Contains(sp.PostId));
        }
        
        var posts = await query.ToListAsync();
        
        foreach (var post in posts)
        {
            post.Status = "Cancelled";
            post.CancelledAt = DateTime.UtcNow;
            
            if (!string.IsNullOrEmpty(post.JobId))
                BackgroundJob.Delete(post.JobId);
        }
        
        await _context.SaveChangesAsync();
        return posts.Count;
    }

    // Optimal Timing
    public async Task<OptimalTimeDto> GetOptimalTimeAsync(string platform, DateTime? preferredDate = null)
    {
        var baseDate = preferredDate ?? DateTime.UtcNow;
        
        // Analyze past performance for this platform
        var analytics = await _context.AnalyticsEvents
            .Where(ae => ae.EventType == "post_published")
            .Where(ae => ae.EventData != null && ae.EventData.Contains($"\"platform\":\"{platform}\""))
            .OrderByDescending(ae => ae.OccurredAt)
            .Take(100)
            .ToListAsync();
        
        // Simple algorithm: Find best performing hour
        var hourlyPerformance = analytics
            .GroupBy(a => a.OccurredAt.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .OrderByDescending(h => h.Count)
            .FirstOrDefault();
        
        var optimalHour = hourlyPerformance?.Hour ?? GetDefaultOptimalHour(platform);
        var optimalTime = new DateTime(
            baseDate.Year, baseDate.Month, baseDate.Day,
            optimalHour, 0, 0, DateTimeKind.Utc);
        
        if (optimalTime < DateTime.UtcNow)
            optimalTime = optimalTime.AddDays(1);
        
        return new OptimalTimeDto
        {
            Platform = platform,
            SuggestedTime = optimalTime,
            EngagementScore = hourlyPerformance != null ? 0.8 : 0.5,
            Analytics = analytics.ToDictionary(
                a => a.Id, 
                a => (object)new { 
                    EventType = a.EventType, 
                    OccurredAt = a.OccurredAt, 
                    Value = a.Value 
                }),
            Reason = hourlyPerformance != null ? "Based on historical performance data" : "Default optimal time"
        };
    }
    
    public async Task<List<OptimalTimeDto>> GetOptimalTimesAsync(List<string> platforms, DateTime? preferredDate = null)
    {
        var optimalTimes = new List<OptimalTimeDto>();
        
        foreach (var platform in platforms)
        {
            var optimal = await GetOptimalTimeAsync(platform, preferredDate);
            optimalTimes.Add(optimal);
        }
        
        return optimalTimes;
    }

    // Queue Management
    public async Task<PublishingQueueDto> GetQueueStatusAsync()
    {
        var pendingCount = await _context.ScheduledPosts
            .CountAsync(sp => sp.Status == "Pending");
        
        var processingCount = await _context.ScheduledPosts
            .CountAsync(sp => sp.Status == "Processing");
        
        var nextUp = await _context.ScheduledPosts
            .Where(sp => sp.Status == "Pending")
            .OrderBy(sp => sp.ScheduledFor)
            .Take(10)
            .Select(sp => new ScheduledPostDto
            {
                Id = sp.Id,
                PostId = sp.PostId,
                ScheduledFor = sp.ScheduledFor ?? DateTime.UtcNow,
                Platforms = sp.Platforms ?? new List<string>(),
                Status = sp.Status,
                ProjectId = sp.ProjectId
            })
            .ToListAsync();
        
        return new PublishingQueueDto
        {
            PendingCount = pendingCount,
            ProcessingCount = processingCount,
            UpcomingPosts = nextUp,
            LastProcessedAt = await _context.ScheduledPosts
                .Where(sp => sp.Status == "Published")
                .MaxAsync(sp => (DateTime?)sp.PublishedAt)
        };
    }
    
    public async Task ProcessScheduledPostAsync(Guid scheduledPostId)
    {
        var scheduledPost = await _context.ScheduledPosts.FindAsync(scheduledPostId);
        if (scheduledPost == null || scheduledPost.Status != "Pending")
            return;
        
        scheduledPost.Status = "Processing";
        await _context.SaveChangesAsync();
        
        try
        {
            var result = await PublishNowAsync(new PublishNowDto
            {
                PostId = scheduledPost.PostId,
                Platforms = scheduledPost.Platforms,
                IgnoreSchedule = true
            });
            
            scheduledPost.Status = "Published";
            scheduledPost.PublishedAt = DateTime.UtcNow;
            scheduledPost.PublishResultJson = JsonSerializer.Serialize(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process scheduled post {Id}", scheduledPostId);
            scheduledPost.Status = "Failed";
            scheduledPost.FailureReason = ex.Message;
        }
        
        await _context.SaveChangesAsync();
    }
    
    public async Task ProcessScheduledPostsAsync()
    {
        var due = await _context.ScheduledPosts
            .Where(sp => sp.Status == "Pending")
            .Where(sp => sp.ScheduledFor <= DateTime.UtcNow)
            .ToListAsync();
        
        foreach (var post in due)
        {
            await ProcessScheduledPostAsync(post.Id);
        }
    }
    
    public async Task<int> RetryFailedPostsAsync(RetryFailedPostsDto dto)
    {
        var query = _context.ScheduledPosts
            .Where(sp => sp.Status == "Failed");
        
        if (dto.Since.HasValue)
            query = query.Where(sp => sp.UpdatedAt >= dto.Since.Value);
        
        if (dto.MaxRetries.HasValue)
            query = query.Where(sp => sp.RetryCount < dto.MaxRetries.Value);
        
        var posts = await query.ToListAsync();
        var retryCount = 0;
        
        foreach (var post in posts)
        {
            post.Status = "Pending";
            post.RetryCount++;
            post.UpdatedAt = DateTime.UtcNow;
            
            // Reschedule for immediate processing
            var jobId = BackgroundJob.Enqueue(() => ProcessScheduledPostAsync(post.Id));
            post.JobId = jobId;
            
            retryCount++;
        }
        
        await _context.SaveChangesAsync();
        return retryCount;
    }
    
    public async Task CleanupOldScheduledPostsAsync(int daysOld = 30)
    {
        var cutoff = DateTime.UtcNow.AddDays(-daysOld);
        
        var oldPosts = await _context.ScheduledPosts
            .Where(sp => sp.Status != "Pending")
            .Where(sp => sp.UpdatedAt < cutoff)
            .ToListAsync();
        
        _context.ScheduledPosts.RemoveRange(oldPosts);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Cleaned up {Count} old scheduled posts", oldPosts.Count);
    }

    // Statistics
    public async Task<PublishingStatsDto> GetPublishingStatsAsync(DateTime? from = null, DateTime? to = null)
    {
        var query = _context.ScheduledPosts.AsQueryable();
        
        if (from.HasValue)
            query = query.Where(sp => sp.CreatedAt >= from.Value);
        
        if (to.HasValue)
            query = query.Where(sp => sp.CreatedAt <= to.Value);
        
        var stats = await query
            .GroupBy(sp => sp.Status)
            .Select(g => new StatusCount { Status = g.Key, Count = g.Count() })
            .ToListAsync();
        
        return new PublishingStatsDto
        {
            TotalScheduled = stats.Sum(s => s.Count),
            Published = stats.FirstOrDefault(s => s.Status == "Published")?.Count ?? 0,
            Pending = stats.FirstOrDefault(s => s.Status == "Pending")?.Count ?? 0,
            Failed = stats.FirstOrDefault(s => s.Status == "Failed")?.Count ?? 0,
            Cancelled = stats.FirstOrDefault(s => s.Status == "Cancelled")?.Count ?? 0,
            SuccessRate = CalculateSuccessRate(stats),
            Period = new DateRangeDto { From = from ?? DateTime.MinValue, To = to ?? DateTime.MaxValue }
        };
    }
    
    public async Task<Dictionary<string, PublishingStatsDto>> GetStatsByPlatformAsync(DateTime? from = null, DateTime? to = null)
    {
        var allPosts = await _context.ScheduledPosts
            .Where(sp => (!from.HasValue || sp.CreatedAt >= from.Value) && 
                        (!to.HasValue || sp.CreatedAt <= to.Value))
            .ToListAsync();
        
        var statsByPlatform = new Dictionary<string, PublishingStatsDto>();
        
        foreach (var platform in _adapters.Keys)
        {
            var platformPosts = allPosts
                .Where(p => p.Platforms.Contains(platform))
                .ToList();
            
            var stats = platformPosts
                .GroupBy(sp => sp.Status)
                .Select(g => new StatusCount { Status = g.Key, Count = g.Count() })
                .ToList();
            
            statsByPlatform[platform] = new PublishingStatsDto
            {
                TotalScheduled = stats.Sum(s => s.Count),
                Published = stats.FirstOrDefault(s => s.Status == "Published")?.Count ?? 0,
                Pending = stats.FirstOrDefault(s => s.Status == "Pending")?.Count ?? 0,
                Failed = stats.FirstOrDefault(s => s.Status == "Failed")?.Count ?? 0,
                Cancelled = stats.FirstOrDefault(s => s.Status == "Cancelled")?.Count ?? 0,
                SuccessRate = CalculateSuccessRate(stats),
                Period = new DateRangeDto { From = from ?? DateTime.MinValue, To = to ?? DateTime.MaxValue }
            };
        }
        
        return statsByPlatform;
    }

    // Platform-specific features
    public async Task<string?> UploadMediaAsync(string platform, byte[] mediaData, string contentType)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return null;
        
        return await adapter.UploadMediaAsync(mediaData, contentType);
    }
    
    public async Task<bool> DeletePostAsync(string platform, string postId)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return false;
        
        return await adapter.DeletePostAsync(postId);
    }
    
    public async Task<Dictionary<string, object>?> GetPostAnalyticsAsync(string platform, string postId)
    {
        if (!_adapters.TryGetValue(platform, out var adapter))
            return null;
        
        return await adapter.GetPostAnalyticsAsync(postId);
    }

    // Helper methods
    private ScheduledPostDto MapToScheduledPostDto(ScheduledPost scheduledPost)
    {
        return new ScheduledPostDto
        {
            Id = scheduledPost.Id,
            PostId = scheduledPost.PostId,
            ProjectId = scheduledPost.ProjectId,
            PostTitle = scheduledPost.Post?.Title ?? "",
            PostContent = scheduledPost.Content ?? "",
            Platforms = scheduledPost.Platforms,
            ScheduledFor = scheduledPost.ScheduledFor ?? scheduledPost.ScheduledTime,
            TimeZone = scheduledPost.TimeZone,
            Status = scheduledPost.Status,
            JobId = scheduledPost.JobId,
            RetryCount = scheduledPost.RetryCount,
            LastAttemptAt = scheduledPost.LastAttempt,
            LastError = scheduledPost.ErrorMessage ?? scheduledPost.FailureReason,
            PublishedAt = scheduledPost.PublishedAt,
            CreatedAt = scheduledPost.CreatedAt
        };
    }
    
    private double CalculateSuccessRate(List<StatusCount> stats)
    {
        var published = stats.FirstOrDefault(s => s.Status == "Published")?.Count ?? 0;
        var total = stats.Sum(s => s.Count);
        return total > 0 ? (double)published / total : 0;
    }
    
    private int GetDefaultOptimalHour(string platform)
    {
        return platform switch
        {
            "LinkedIn" => 9,  // 9 AM is typically good for LinkedIn
            _ => 10           // Default to 10 AM
        };
    }

    private async Task LogPublishingAnalytics(Guid postId, string platform, bool success)
    {
        var analyticsEvent = new AnalyticsEvent
        {
            Id = Guid.NewGuid().ToString(),
            EventType = "post_published",
            EventData = JsonSerializer.Serialize(new
            {
                PostId = postId,
                Platform = platform,
                Success = success,
                Timestamp = DateTime.UtcNow
            }),
            OccurredAt = DateTime.UtcNow
        };
        
        _context.AnalyticsEvents.Add(analyticsEvent);
        await _context.SaveChangesAsync();
    }
    
    // ISocialPostPublisher implementation
    public async Task PublishPostAsync(string projectId, string postId)
    {
        _logger.LogInformation("Publishing post {PostId} for project {ProjectId}", postId, projectId);
        
        // Get the post details
        var post = await _context.Posts.FindAsync(postId);
        if (post == null)
        {
            _logger.LogError("Post {PostId} not found", postId);
            return;
        }
        
        // Publish to the configured platform
        await PublishToLinkedInAsync(postId);
    }
    
    public async Task PublishToLinkedInAsync(string postId)
    {
        _logger.LogInformation("Publishing to LinkedIn: {PostId}", postId);
        
        var post = await _context.Posts.FindAsync(postId);
        if (post == null)
        {
            _logger.LogError("Post {PostId} not found", postId);
            return;
        }
        
        // TODO: Implement actual LinkedIn publishing
        await Task.Delay(100); // Simulate API call
        
        _logger.LogInformation("Successfully published to LinkedIn: {PostId}", postId);
    }
    
    public async Task PublishToXAsync(string postId)
    {
        _logger.LogInformation("Publishing to X/Twitter not implemented: {PostId}", postId);
        // Twitter/X removed for Phase 1
        await Task.CompletedTask;
    }
    
    private class StatusCount
    {
        public string Status { get; set; } = string.Empty;
        public int Count { get; set; }
    }
    
    // IPublishingService Implementation
    public async Task<string?> PublishToSocialMedia(Post post, string platform)
    {
        return await PublishToSocialMedia(post, platform, CancellationToken.None);
    }
    
    public async Task<string?> PublishToSocialMedia(Post post, string platform, CancellationToken cancellationToken)
    {
        try
        {
            // Use the existing PublishNowAsync method that accepts PublishNowDto
            var dto = new PublishNowDto
            {
                PostId = Guid.Parse(post.Id),
                Platforms = new List<string> { platform },
                IgnoreSchedule = true
            };
            
            var result = await PublishNowAsync(dto);
            
            if (result.Success && result.PlatformResults.Any())
            {
                return result.PlatformResults.First().PostId;
            }
            
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing to {Platform}", platform);
            return null;
        }
    }
    
    public async Task<Dictionary<string, (bool Success, string? ExternalId, string? Error)>> PublishMultiPlatform(Post post, List<string> platforms)
    {
        var detailedResults = await PublishMultiPlatform(post, platforms, CancellationToken.None);
        var simpleResults = new Dictionary<string, (bool Success, string? ExternalId, string? Error)>();
        
        foreach (var kvp in detailedResults)
        {
            var result = kvp.Value;
            var platformResult = result.PlatformResults.FirstOrDefault(pr => pr.Platform == kvp.Key);
            var externalId = platformResult?.PostId;
            var error = platformResult?.Error;
            simpleResults[kvp.Key] = (result.Success, externalId, error);
        }
        
        return simpleResults;
    }
    
    public async Task<Dictionary<string, PublishResultDto>> PublishMultiPlatform(Post post, List<string> platforms, CancellationToken cancellationToken)
    {
        var results = new Dictionary<string, PublishResultDto>();
        
        foreach (var platform in platforms)
        {
            var dto = new PublishNowDto
            {
                PostId = Guid.Parse(post.Id),
                Platforms = new List<string> { platform },
                IgnoreSchedule = true
            };
            
            var result = await PublishNowAsync(dto);
            results[platform] = result;
        }
        
        return results;
    }
    
    public async Task<PublishResultDto> PublishNowAsync(string postId, CancellationToken cancellationToken = default)
    {
        var dto = new PublishNowDto
        {
            PostId = Guid.Parse(postId),
            Platforms = new List<string> { "linkedin" }, // Default to LinkedIn for Phase 1
            IgnoreSchedule = true
        };
        
        return await PublishNowAsync(dto);
    }
}