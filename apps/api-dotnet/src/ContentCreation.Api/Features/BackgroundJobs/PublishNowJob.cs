using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Hangfire;
using System.Text.Json;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class PublishNowJob
{
    private readonly ILogger<PublishNowJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly ISocialPostPublisher _publishingService;

    public PublishNowJob(
        ILogger<PublishNowJob> logger,
        ApplicationDbContext context,
        ISocialPostPublisher publishingService)
    {
        _logger = logger;
        _context = context;
        _publishingService = publishingService;
    }

    [Queue("critical")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 30, 60, 300 })]
    public async Task PublishImmediately(Guid postId, string platform)
    {
        _logger.LogInformation("Publishing post {PostId} immediately to {Platform}", postId, platform);
        
        var job = await CreateProcessingJob(postId, ProcessingJobType.PublishPost);
        
        try
        {
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 10);
            
            var post = await _context.Posts
                .Include(p => p.Project)
                .FirstOrDefaultAsync(p => p.Id == postId);
            
            if (post == null)
            {
                throw new Exception($"Post {postId} not found");
            }
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 30);
            
            var optimizedContent = await OptimizeContentForPlatform(post.Content, platform);
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 50);
            
            string? externalId = await _publishingService.PublishToSocialMedia(
                post,
                platform);
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 80);
            
            await MarkPostAsPublished(post, platform, externalId);
            
            await CompleteJob(job, 1);
            
            _logger.LogInformation("Successfully published post {PostId} to {Platform} with external ID {ExternalId}",
                postId, platform, externalId);
            
            await LogProjectEvent(post.ProjectId, "post_published_immediately", 
                $"Published post immediately to {platform}",
                new { PostId = postId, Platform = platform, ExternalId = externalId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing post {PostId} to {Platform}", postId, platform);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    [Queue("critical")]
    public async Task PublishBatchImmediately(List<string> postIds, string platform)
    {
        _logger.LogInformation("Publishing batch of {Count} posts immediately to {Platform}", 
            postIds.Count, platform);
        
        var successCount = 0;
        var failedPosts = new List<string>();
        
        foreach (var postId in postIds)
        {
            try
            {
                await PublishImmediately(postId, platform);
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish post {PostId} in batch", postId);
                failedPosts.Add(postId);
            }
        }
        
        _logger.LogInformation("Batch publish completed. Success: {Success}, Failed: {Failed}",
            successCount, failedPosts.Count);
        
        if (failedPosts.Any())
        {
            throw new Exception($"Failed to publish {failedPosts.Count} posts: {string.Join(", ", failedPosts)}");
        }
    }

    [Queue("critical")]
    public async Task PublishToMultiplePlatforms(Guid postId, List<string> platforms)
    {
        _logger.LogInformation("Publishing post {PostId} to multiple platforms: {Platforms}", 
            postId, string.Join(", ", platforms));
        
        var post = await _context.Posts
            .Include(p => p.Project)
            .FirstOrDefaultAsync(p => p.Id == postId);
        
        if (post == null)
        {
            _logger.LogError("Post {PostId} not found", postId);
            throw new Exception($"Post {postId} not found");
        }
        
        var results = new Dictionary<string, (bool Success, string? ExternalId, string? Error)>();
        
        foreach (var platform in platforms)
        {
            try
            {
                var optimizedContent = await OptimizeContentForPlatform(post.Content, platform);
                
                string? externalId = await _publishingService.PublishToSocialMedia(
                    post,
                    platform);
                
                results[platform] = (true, externalId, null);
                
                _logger.LogInformation("Published to {Platform} with ID {ExternalId}", platform, externalId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish to {Platform}", platform);
                results[platform] = (false, null, ex.Message);
            }
        }
        
        var successPlatforms = results.Where(r => r.Value.Success).Select(r => r.Key).ToList();
        var failedPlatforms = results.Where(r => !r.Value.Success).Select(r => r.Key).ToList();
        
        if (successPlatforms.Any())
        {
            await MarkPostAsPublishedMultiPlatform(post, results);
        }
        
        await LogProjectEvent(post.ProjectId.ToString(), "post_multi_platform_publish",
            $"Published to {successPlatforms.Count} platforms, failed on {failedPlatforms.Count}",
            new { Results = results });
        
        if (failedPlatforms.Any())
        {
            throw new Exception($"Failed to publish to: {string.Join(", ", failedPlatforms)}");
        }
    }

    [Queue("critical")]
    public async Task RepublishPost(Guid postId, string platform, string reason)
    {
        _logger.LogInformation("Republishing post {PostId} to {Platform}. Reason: {Reason}", 
            postId, platform, reason);
        
        var post = await _context.Posts
            .Include(p => p.Project)
            .FirstOrDefaultAsync(p => p.Id == postId);
        
        if (post == null)
        {
            throw new Exception($"Post {postId} not found");
        }
        
        var existingScheduledPost = await _context.ProjectScheduledPosts
            .FirstOrDefaultAsync(sp => sp.PostId == postId && sp.Platform == platform);
        
        if (existingScheduledPost != null)
        {
            existingScheduledPost.Status = ScheduledPostStatus.Republishing;
            existingScheduledPost.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        
        await PublishImmediately(postId, platform);
        
        await LogProjectEvent(post.ProjectId.ToString(), "post_republished",
            $"Republished post to {platform}. Reason: {reason}",
            new { PostId = postId, Platform = platform, Reason = reason });
    }

    private Task<string> OptimizeContentForPlatform(string content, string platform)
    {
        var result = platform.ToLower() switch
        {
            "linkedin" => OptimizeForLinkedIn(content),
            "twitter" or "x" => OptimizeForTwitter(content),
            "facebook" => OptimizeForFacebook(content),
            "instagram" => OptimizeForInstagram(content),
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

    private string OptimizeForFacebook(string content)
    {
        if (content.Length > 63206)
        {
            content = content.Substring(0, 63203) + "...";
        }
        
        return content;
    }

    private string OptimizeForInstagram(string content)
    {
        if (content.Length > 2200)
        {
            content = content.Substring(0, 2197) + "...";
        }
        
        var hashtagCount = content.Count(c => c == '#');
        if (hashtagCount > 30)
        {
            _logger.LogWarning("Instagram post has more than 30 hashtags, which may affect reach");
        }
        
        return content;
    }

    private async Task MarkPostAsPublished(Post post, string platform, string? externalId)
    {
        post.Status = PostStatus.Published;
        post.PublishedAt = DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;
        
        var publishingInfo = new
        {
            Platform = platform,
            ExternalId = externalId,
            PublishedAt = DateTime.UtcNow,
            PublishType = "immediate"
        };
        
        UpdatePostMetadata(post, publishingInfo);
        
        var scheduledPost = new ProjectScheduledPost
        {
            ProjectId = post.ProjectId,
            PostId = post.Id,
            Platform = platform,
            Content = post.Content,
            ScheduledTime = DateTime.UtcNow,
            Status = ScheduledPostStatus.Published,
            ExternalPostId = externalId,
            PublishedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectScheduledPosts.Add(scheduledPost);
        
        await _context.SaveChangesAsync();
    }

    private async Task MarkPostAsPublishedMultiPlatform(Post post, 
        Dictionary<string, (bool Success, string? ExternalId, string? Error)> results)
    {
        post.Status = PostStatus.Published;
        post.PublishedAt = DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;
        
        var publishingInfoList = new List<object>();
        
        foreach (var (platform, result) in results.Where(r => r.Value.Success))
        {
            var publishingInfo = new
            {
                Platform = platform,
                ExternalId = result.ExternalId,
                PublishedAt = DateTime.UtcNow,
                PublishType = "immediate"
            };
            
            publishingInfoList.Add(publishingInfo);
            
            var scheduledPost = new ProjectScheduledPost
            {
                ProjectId = post.ProjectId,
                PostId = post.Id,
                Platform = platform,
                Content = post.Content,
                ScheduledTime = DateTime.UtcNow,
                Status = ScheduledPostStatus.Published,
                ExternalPostId = result.ExternalId,
                PublishedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _context.ProjectScheduledPosts.Add(scheduledPost);
        }
        
        UpdatePostMetadataMultiple(post, publishingInfoList);
        
        await _context.SaveChangesAsync();
    }

    private void UpdatePostMetadata(Post post, object publishingInfo)
    {
        if (post.Metadata == null)
        {
            post.Metadata = new Dictionary<string, object>
            {
                { "Publishing", new[] { publishingInfo } }
            };
        }
        else
        {
            if (post.Metadata.TryGetValue("Publishing", out var publishing))
            {
                var publishingList = publishing as List<object> ?? new List<object> { publishing };
                publishingList.Add(publishingInfo);
                post.Metadata["Publishing"] = publishingList;
            }
            else
            {
                post.Metadata["Publishing"] = new[] { publishingInfo };
            }
        }
    }

    private void UpdatePostMetadataMultiple(Post post, List<object> publishingInfoList)
    {
        if (post.Metadata == null)
        {
            post.Metadata = new Dictionary<string, object>
            {
                { "Publishing", publishingInfoList }
            };
        }
        else
        {
            if (post.Metadata.TryGetValue("Publishing", out var publishing))
            {
                var existingList = publishing as List<object> ?? new List<object> { publishing };
                existingList.AddRange(publishingInfoList);
                post.Metadata["Publishing"] = existingList;
            }
            else
            {
                post.Metadata["Publishing"] = publishingInfoList;
            }
        }
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(Guid postId, ProcessingJobType jobType)
    {
        var post = await _context.Posts.FindAsync(postId);
        if (post == null)
        {
            throw new Exception($"Post {postId} not found");
        }
        
        var job = new ProjectProcessingJob
        {
            ProjectId = post.ProjectId,
            JobType = jobType,
            Status = ProcessingJobStatus.Queued,
            Metadata = JsonSerializer.Serialize(new { PostId = postId }),
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