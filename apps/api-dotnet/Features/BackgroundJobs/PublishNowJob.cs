using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Hangfire;
using System.Text.Json;
using MediatR;
using ContentCreation.Api.Features.Publishing;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class PublishNowJob
{
    private readonly ILogger<PublishNowJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IMediator _mediator;

    public PublishNowJob(
        ILogger<PublishNowJob> logger,
        ApplicationDbContext context,
        IMediator mediator)
    {
        _logger = logger;
        _context = context;
        _mediator = mediator;
    }

    [Queue("critical")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 30, 60, 300 })]
    public async Task PublishImmediately(Guid postId, SocialPlatform platform)
    {
        _logger.LogInformation("Publishing post {PostId} immediately to {Platform}", postId, platform);
        
        try
        {
            var post = await _context.Posts
                .Include(p => p.Project)
                .FirstOrDefaultAsync(p => p.Id == postId);
            
            if (post == null)
            {
                throw new Exception($"Post {postId} not found");
            }
            
            var optimizedContent = await OptimizeContentForPlatform(post.Content, platform);
            
            // Use MediatR to publish via the appropriate handler
            string? externalId = null;
            if (platform == SocialPlatform.LinkedIn)
            {
                var publishResult = await _mediator.Send(new PublishToLinkedIn.Request(
                    ProjectId: post.ProjectId,
                    PostId: post.Id,
                    UserId: post.Project?.UserId ?? Guid.Empty,
                    PublishNow: true
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
            else
            {
                // For other platforms, log and continue (Phase 1 only supports LinkedIn)
                _logger.LogWarning("Platform {Platform} not yet implemented, using stub", platform);
                externalId = $"stub-{platform}-{Guid.NewGuid():N}";
            }
            
            await MarkPostAsPublished(post, platform, externalId);
            
            _logger.LogInformation("Successfully published post {PostId} to {Platform} with external ID {ExternalId}",
                postId, platform, externalId);
            
            await LogProjectEvent(post.ProjectId.ToString(), "post_published_immediately", 
                $"Published post immediately to {platform}",
                new { PostId = postId, Platform = platform, ExternalId = externalId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing post {PostId} to {Platform}", postId, platform);
            throw;
        }
    }

    [Queue("critical")]
    public async Task PublishBatchImmediately(List<string> postIds, SocialPlatform platform)
    {
        _logger.LogInformation("Publishing batch of {Count} posts immediately to {Platform}", 
            postIds.Count, platform);
        
        var successCount = 0;
        var failedPosts = new List<string>();
        
        foreach (var postId in postIds)
        {
            try
            {
                await PublishImmediately(Guid.Parse(postId), platform);
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
    public async Task PublishToMultiplePlatforms(Guid postId, List<SocialPlatform> platforms)
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
                
                string? externalId = null;
                if (platform == SocialPlatform.LinkedIn)
                {
                    var publishResult = await _mediator.Send(new PublishToLinkedIn.Request(
                        ProjectId: post.ProjectId,
                        PostId: post.Id,
                        UserId: post.Project?.UserId ?? Guid.Empty,
                        PublishNow: true
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
                else
                {
                    _logger.LogWarning("Platform {Platform} not yet implemented", platform);
                    externalId = $"stub-{platform}-{Guid.NewGuid():N}";
                }
                
                results[platform.ToString()] = (true, externalId, null);
                
                _logger.LogInformation("Published to {Platform} with ID {ExternalId}", platform, externalId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish to {Platform}", platform);
                results[platform.ToString()] = (false, null, ex.Message);
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
    public async Task RepublishPost(Guid postId, SocialPlatform platform, string reason)
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
        
        var existingScheduledPost = await _context.ScheduledPosts
            .FirstOrDefaultAsync(sp => sp.PostId == postId && sp.Platform == platform);
        
        if (existingScheduledPost != null)
        {
            // Use domain method to update status
            existingScheduledPost.UpdateStatus(ScheduledPostStatus.Republishing);
            await _context.SaveChangesAsync();
        }
        
        await PublishImmediately(postId, platform);
        
        await LogProjectEvent(post.ProjectId.ToString(), "post_republished",
            $"Republished post to {platform}. Reason: {reason}",
            new { PostId = postId, Platform = platform, Reason = reason });
    }

    private Task<string> OptimizeContentForPlatform(string content, SocialPlatform platform)
    {
        var result = platform switch
        {
            SocialPlatform.LinkedIn => OptimizeForLinkedIn(content),
            SocialPlatform.Twitter => OptimizeForTwitter(content),
            SocialPlatform.Facebook => OptimizeForFacebook(content),
            SocialPlatform.Instagram => OptimizeForInstagram(content),
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

    private async Task MarkPostAsPublished(Post post, SocialPlatform platform, string? externalId)
    {
        // Use domain method to mark as published
        post.MarkAsPublished();
        
        var publishingInfo = new
        {
            Platform = platform,
            ExternalId = externalId,
            PublishedAt = DateTime.UtcNow,
            PublishType = "immediate"
        };
        
        UpdatePostMetadata(post, publishingInfo);
        
        var scheduledPost = ScheduledPost.Create(
            projectId: post.ProjectId,
            postId: post.Id,
            platform: platform,
            content: post.Content,
            scheduledFor: DateTime.UtcNow,
            timeZone: "UTC"
        );
        
        // Mark as immediately published
        scheduledPost.MarkAsPublished(externalId, DateTime.UtcNow);
        
        _context.ScheduledPosts.Add(scheduledPost);
        
        await _context.SaveChangesAsync();
    }

    private async Task MarkPostAsPublishedMultiPlatform(Post post, 
        Dictionary<string, (bool Success, string? ExternalId, string? Error)> results)
    {
        // Use domain method to mark as published
        post.MarkAsPublished();
        
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
            
            var scheduledPost = ScheduledPost.Create(
                projectId: post.ProjectId,
                postId: post.Id,
                platform: Enum.Parse<SocialPlatform>(platform),
                content: post.Content,
                scheduledFor: DateTime.UtcNow,
                timeZone: "UTC"
            );
            
            // Mark as immediately published
            scheduledPost.MarkAsPublished(result.ExternalId, DateTime.UtcNow);
            
            _context.ScheduledPosts.Add(scheduledPost);
        }
        
        UpdatePostMetadataMultiple(post, publishingInfoList);
        
        await _context.SaveChangesAsync();
    }

    private void UpdatePostMetadata(Post post, object publishingInfo)
    {
        var metadata = post.Metadata ?? new Dictionary<string, object>();
        
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
        
        post.SetMetadata(metadata);
    }

    private void UpdatePostMetadataMultiple(Post post, List<object> publishingInfoList)
    {
        var metadata = post.Metadata ?? new Dictionary<string, object>();
        
        if (metadata.TryGetValue("Publishing", out var publishing))
        {
            var existingList = publishing as List<object> ?? new List<object> { publishing };
            existingList.AddRange(publishingInfoList);
            metadata["Publishing"] = existingList;
        }
        else
        {
            metadata["Publishing"] = publishingInfoList;
        }
        
        post.SetMetadata(metadata);
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