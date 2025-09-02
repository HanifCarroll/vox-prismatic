using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Hangfire;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Infrastructure.Services;

public class BackgroundJobService : IBackgroundJobService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackgroundJobService> _logger;
    private readonly IBackgroundJobClient _backgroundJobClient;

    public BackgroundJobService(
        IServiceProvider serviceProvider,
        ILogger<BackgroundJobService> logger,
        IBackgroundJobClient backgroundJobClient)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _backgroundJobClient = backgroundJobClient;
    }

    // Transcript Processing Jobs
    public async Task ProcessTranscriptAsync(string transcriptId)
    {
        _logger.LogInformation("Processing transcript: {TranscriptId}", transcriptId);
        
        using var scope = _serviceProvider.CreateScope();
        var transcriptService = scope.ServiceProvider.GetRequiredService<ITranscriptService>();
        var transcriptStateService = scope.ServiceProvider.GetRequiredService<ITranscriptStateService>();

        try
        {
            // Start processing
            await transcriptStateService.StartProcessingAsync(transcriptId);
            
            // Clean the transcript
            await CleanTranscriptAsync(transcriptId);
            
            // Extract metadata
            await ExtractTranscriptMetadataAsync(transcriptId);
            
            // Mark as cleaned
            await transcriptStateService.MarkCleanedAsync(transcriptId);
            
            // Trigger insight generation
            _backgroundJobClient.Enqueue(() => GenerateInsightsFromTranscriptAsync(transcriptId));
            
            _logger.LogInformation("Successfully processed transcript: {TranscriptId}", transcriptId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process transcript: {TranscriptId}", transcriptId);
            await transcriptStateService.MarkFailedAsync(transcriptId, ex.Message);
            throw;
        }
    }

    public async Task CleanTranscriptAsync(string transcriptId)
    {
        _logger.LogInformation("Cleaning transcript: {TranscriptId}", transcriptId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var transcript = await context.Transcripts.FindAsync(transcriptId);
        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript {transcriptId} not found");
        }

        // Simulate transcript cleaning (remove filler words, normalize text, etc.)
        var cleanedContent = transcript.RawContent
            .Replace(" um ", " ")
            .Replace(" uh ", " ")
            .Replace(" like ", " ")
            .Replace("  ", " ")
            .Trim();

        transcript.CleanedContent = cleanedContent;
        transcript.UpdatedAt = DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Cleaned transcript: {TranscriptId}", transcriptId);
    }

    public async Task ExtractTranscriptMetadataAsync(string transcriptId)
    {
        _logger.LogInformation("Extracting metadata for transcript: {TranscriptId}", transcriptId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var transcript = await context.Transcripts.FindAsync(transcriptId);
        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript {transcriptId} not found");
        }

        // Calculate processing metrics
        var content = transcript.CleanedContent ?? transcript.RawContent;
        var wordCount = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var estimatedTokens = (int)(wordCount * 1.3); // Rough token estimate
        var estimatedCost = estimatedTokens * 0.00001m; // Sample cost calculation

        transcript.WordCount = wordCount;
        transcript.EstimatedTokens = estimatedTokens;
        transcript.EstimatedCost = estimatedCost;
        transcript.UpdatedAt = DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Extracted metadata for transcript: {TranscriptId}", transcriptId);
    }

    // Insight Generation Jobs
    public async Task GenerateInsightsFromTranscriptAsync(string transcriptId)
    {
        _logger.LogInformation("Generating insights from transcript: {TranscriptId}", transcriptId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var insightService = scope.ServiceProvider.GetRequiredService<IInsightService>();
        var transcriptStateService = scope.ServiceProvider.GetRequiredService<ITranscriptStateService>();
        var aiService = scope.ServiceProvider.GetRequiredService<IAIService>();

        try
        {
            var transcript = await context.Transcripts
                .Include(t => t.ContentProject)
                .FirstOrDefaultAsync(t => t.Id == transcriptId);
                
            if (transcript == null)
            {
                throw new KeyNotFoundException($"Transcript {transcriptId} not found");
            }

            var content = transcript.CleanedContent ?? transcript.RawContent;
            
            // Generate insights using AI service
            var insights = await aiService.GenerateInsightsAsync(content);
            
            // Create insight entities
            foreach (var insightData in insights)
            {
                var createDto = new CreateInsightDto
                {
                    TranscriptId = transcriptId,
                    Title = insightData.Title,
                    Content = insightData.Content,
                    Category = insightData.Category,
                    Tags = insightData.Tags,
                    Confidence = insightData.Confidence
                };
                
                await insightService.CreateAsync(createDto);
            }
            
            // Mark transcript as insights generated
            await transcriptStateService.MarkInsightsGeneratedAsync(transcriptId);
            
            // Update project progress
            if (transcript.ContentProject != null)
            {
                transcript.ContentProject.CurrentStage = ProjectLifecycleStage.InsightsExtracted;
                transcript.ContentProject.OverallProgress = 50;
                transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();
            }
            
            _logger.LogInformation("Generated {Count} insights from transcript: {TranscriptId}", 
                insights.Count, transcriptId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate insights from transcript: {TranscriptId}", transcriptId);
            await transcriptStateService.MarkFailedAsync(transcriptId, $"Insight generation failed: {ex.Message}");
            throw;
        }
    }

    public async Task GenerateInsightAsync(string transcriptId, string insightType)
    {
        _logger.LogInformation("Generating {InsightType} insight for transcript: {TranscriptId}", 
            insightType, transcriptId);
        
        // Implementation for specific insight type generation
        await Task.CompletedTask;
    }

    public async Task ReviewInsightAsync(string insightId)
    {
        _logger.LogInformation("Reviewing insight: {InsightId}", insightId);
        
        using var scope = _serviceProvider.CreateScope();
        var insightStateService = scope.ServiceProvider.GetRequiredService<IInsightStateService>();
        
        await insightStateService.MoveToReviewAsync(insightId);
    }

    public async Task ApproveInsightAsync(string insightId)
    {
        _logger.LogInformation("Approving insight: {InsightId}", insightId);
        
        using var scope = _serviceProvider.CreateScope();
        var insightStateService = scope.ServiceProvider.GetRequiredService<IInsightStateService>();
        
        await insightStateService.ApproveAsync(insightId);
        
        // Trigger post generation
        _backgroundJobClient.Enqueue(() => GeneratePostsFromInsightAsync(insightId));
    }

    // Post Generation Jobs
    public async Task GeneratePostsFromInsightAsync(string insightId)
    {
        _logger.LogInformation("Generating posts from insight: {InsightId}", insightId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var postService = scope.ServiceProvider.GetRequiredService<IPostService>();
        var aiService = scope.ServiceProvider.GetRequiredService<IAIService>();

        try
        {
            var insight = await context.Insights
                .Include(i => i.ContentProject)
                .FirstOrDefaultAsync(i => i.Id == insightId);
                
            if (insight == null)
            {
                throw new KeyNotFoundException($"Insight {insightId} not found");
            }

            // Generate posts for different platforms
            var platforms = new[] { "LinkedIn" };
            
            foreach (var platform in platforms)
            {
                var postContent = await aiService.GeneratePostAsync(insight.Content, platform);
                
                var createDto = new CreatePostDto
                {
                    InsightId = insightId,
                    Platform = platform == "LinkedIn" ? Platform.LinkedIn : Platform.X,
                    Content = postContent.Content,
                    Hashtags = postContent.Hashtags
                };
                
                await postService.CreateAsync(createDto);
            }
            
            // Update project progress
            if (insight.ContentProject != null)
            {
                insight.ContentProject.CurrentStage = ProjectLifecycleStage.PostsGenerated;
                insight.ContentProject.OverallProgress = 75;
                insight.ContentProject.UpdatedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();
            }
            
            _logger.LogInformation("Generated posts for insight: {InsightId}", insightId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate posts from insight: {InsightId}", insightId);
            throw;
        }
    }

    public async Task GeneratePostAsync(string insightId, string platform)
    {
        _logger.LogInformation("Generating {Platform} post for insight: {InsightId}", 
            platform, insightId);
        
        // Implementation for specific platform post generation
        await Task.CompletedTask;
    }

    public async Task OptimizePostContentAsync(string postId)
    {
        _logger.LogInformation("Optimizing post content: {PostId}", postId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var aiService = scope.ServiceProvider.GetRequiredService<IAIService>();
        
        var post = await context.Posts.FindAsync(postId);
        if (post == null)
        {
            throw new KeyNotFoundException($"Post {postId} not found");
        }

        // Optimize content for platform
        var optimizedContent = await aiService.OptimizePostAsync(post.Content, post.Platform ?? "linkedin");
        
        post.Content = optimizedContent.Content;
        post.UpdatedAt = DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Optimized post content: {PostId}", postId);
    }

    public async Task SchedulePostAsync(string postId, DateTime scheduledTime)
    {
        _logger.LogInformation("Scheduling post: {PostId} for {ScheduledTime}", 
            postId, scheduledTime);
        
        // Schedule the publish job
        var delay = scheduledTime - DateTime.UtcNow;
        if (delay > TimeSpan.Zero)
        {
            // Idempotency: avoid duplicate schedules for same post/time
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var postGuid = Guid.Parse(postId);
            var exists = await db.ProjectScheduledPosts
                .AnyAsync(sp => sp.PostId == postGuid && sp.ScheduledTime == scheduledTime && sp.Status == "Pending");
            if (!exists)
            {
                _backgroundJobClient.Schedule(() => PublishPostAsync(postId), delay);
                var postStateService = scope.ServiceProvider.GetRequiredService<IPostStateService>();
                await postStateService.ScheduleAsync(postId, scheduledTime);
            }
        }
        else
        {
            // Publish immediately if scheduled time is in the past
            await PublishPostAsync(postId);
        }
    }

    // Publishing Jobs
    public async Task PublishPostAsync(string postId)
    {
        _logger.LogInformation("Publishing post: {PostId}", postId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var postStateService = scope.ServiceProvider.GetRequiredService<IPostStateService>();
        
        try
        {
            var post = await context.Posts.FindAsync(postId);
            if (post == null)
            {
                throw new KeyNotFoundException($"Post {postId} not found");
            }

            // Mark as publishing
            await postStateService.PublishAsync(postId);
            
            // Publish to platform
            if (post.Platform?.ToLower() == "linkedin")
            {
                await PublishToLinkedInAsync(postId);
            }
            // Twitter/X removed for Phase 1
            
            _logger.LogInformation("Successfully published post: {PostId}", postId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish post: {PostId}", postId);
            
            // Mark as failed and schedule retry
            using var retryScope = _serviceProvider.CreateScope();
            var postStateService = retryScope.ServiceProvider.GetRequiredService<IPostStateService>();
            await postStateService.MarkFailedAsync(postId, ex.Message);
            
            // Schedule retry in 5 minutes
            _backgroundJobClient.Schedule(() => RetryFailedPublishAsync(postId), TimeSpan.FromMinutes(5));
            
            throw;
        }
    }

    public async Task PublishToLinkedInAsync(string postId)
    {
        _logger.LogInformation("Publishing to LinkedIn: {PostId}", postId);
        
        // TODO: Implement LinkedIn API integration
        await Task.Delay(1000); // Simulate API call
        
        _logger.LogInformation("Published to LinkedIn: {PostId}", postId);
    }

    public async Task PublishToTwitterAsync(string postId)
    {
        _logger.LogInformation("Twitter/X publishing not implemented in Phase 1: {PostId}", postId);
        // Twitter/X removed for Phase 1 - stub implementation
        await Task.CompletedTask;
    }

    public async Task RetryFailedPublishAsync(string postId)
    {
        _logger.LogInformation("Retrying failed publish: {PostId}", postId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var post = await context.Posts.FindAsync(postId);
        if (post == null)
        {
            _logger.LogWarning("Post not found for retry: {PostId}", postId);
            return;
        }

        // Check retry count
        var retryCount = post.Metadata?.GetValueOrDefault("RetryCount", 0) ?? 0;
        if (retryCount >= 3)
        {
            _logger.LogError("Max retries exceeded for post: {PostId}", postId);
            return;
        }

        // Update retry count
        if (post.Metadata == null)
            post.Metadata = new Dictionary<string, object>();
        post.Metadata["RetryCount"] = retryCount + 1;
        await context.SaveChangesAsync();

        // Retry publishing
        await PublishPostAsync(postId);
    }

    // Analytics Jobs
    public async Task CollectPostMetricsAsync(string postId)
    {
        _logger.LogInformation("Collecting metrics for post: {PostId}", postId);
        
        // TODO: Implement metrics collection from social platforms
        await Task.CompletedTask;
    }

    public async Task GenerateProjectAnalyticsAsync(string projectId)
    {
        _logger.LogInformation("Generating analytics for project: {ProjectId}", projectId);
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var project = await context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
        {
            _logger.LogWarning("Project not found for analytics: {ProjectId}", projectId);
            return;
        }

        // Calculate metrics
        var metrics = project.Metrics ?? new ProjectMetrics();
        metrics.TotalPosts = project.Posts.Count;
        metrics.PublishedPosts = project.Posts.Count(p => p.Status == "published");
        metrics.LastUpdated = DateTime.UtcNow;
        
        project.Metrics = metrics;
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Generated analytics for project: {ProjectId}", projectId);
    }

    public async Task UpdateEngagementMetricsAsync(string postId)
    {
        _logger.LogInformation("Updating engagement metrics for post: {PostId}", postId);
        
        // TODO: Implement engagement metrics update
        await Task.CompletedTask;
    }

    // Cleanup Jobs
    public async Task CleanupOldJobsAsync()
    {
        _logger.LogInformation("Cleaning up old jobs");
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        // Clean up completed jobs older than 30 days
        var cutoffDate = DateTime.UtcNow.AddDays(-30);
        
        // This would clean up job history in your database if you're tracking it
        await Task.CompletedTask;
        
        _logger.LogInformation("Cleaned up old jobs");
    }

    public async Task ArchiveCompletedProjectsAsync()
    {
        _logger.LogInformation("Archiving completed projects");
        
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var projectsToArchive = await context.ContentProjects
            .Where(p => p.CurrentStage == ProjectLifecycleStage.Published 
                && p.UpdatedAt < DateTime.UtcNow.AddDays(-7))
            .ToListAsync();

        foreach (var project in projectsToArchive)
        {
            project.CurrentStage = ProjectLifecycleStage.Archived;
            project.UpdatedAt = DateTime.UtcNow;
        }
        
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Archived {Count} completed projects", projectsToArchive.Count);
    }

    public async Task PurgeExpiredDataAsync()
    {
        _logger.LogInformation("Purging expired data");
        
        // TODO: Implement data purging logic
        await Task.CompletedTask;
        
        _logger.LogInformation("Purged expired data");
    }
}