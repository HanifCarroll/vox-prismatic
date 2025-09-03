using Hangfire;
using ContentCreation.Api.Features.BackgroundJobs;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common;

/// <summary>
/// Centralized service for managing all Hangfire background jobs.
/// Handles both one-time job queuing and recurring job setup.
/// </summary>
public class BackgroundJobService
{
    private readonly IBackgroundJobClient _jobClient;
    private readonly IRecurringJobManager _recurringJobManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BackgroundJobService> _logger;

    public BackgroundJobService(
        IBackgroundJobClient jobClient,
        IRecurringJobManager recurringJobManager,
        IConfiguration configuration,
        ILogger<BackgroundJobService> logger)
    {
        _jobClient = jobClient;
        _recurringJobManager = recurringJobManager;
        _configuration = configuration;
        _logger = logger;
    }

    // Queue Methods for Background Jobs
    public string QueueContentProcessing(Guid projectId, string contentUrl = "", string contentType = "audio")
    {
        _logger.LogInformation("Queuing content processing for project {ProjectId}", projectId);
        return _jobClient.Enqueue<ProcessContentJob>(job => job.ProcessContentAsync(projectId));
    }

    public string QueueInsightExtraction(Guid projectId, bool autoApprove = false)
    {
        _logger.LogInformation("Queuing insight extraction for project {ProjectId}", projectId);
        return _jobClient.Enqueue<InsightExtractionJob>(job => job.ExtractInsights(projectId));
    }

    public string QueuePostGeneration(Guid projectId, string platform = "LinkedIn", bool autoApprove = false)
    {
        _logger.LogInformation("Queuing post generation for project {ProjectId} on {Platform}", projectId, platform);
        return _jobClient.Enqueue<PostGenerationJob>(job => job.GeneratePosts(projectId));
    }

    public string QueueSchedulePost(Guid projectId, Guid postId, DateTime scheduledTime)
    {
        _logger.LogInformation("Queuing post scheduling for post {PostId} at {ScheduledTime}", postId, scheduledTime);
        return _jobClient.Schedule<SchedulePostsJob>(
            job => job.SchedulePost(projectId, postId, scheduledTime), 
            scheduledTime);
    }
    
    public string QueuePublishNow(Guid projectId, Guid postId)
    {
        _logger.LogInformation("Queuing immediate publishing for post {PostId}", postId);
        return _jobClient.Enqueue<PublishNowJob>(job => job.PublishImmediately(postId, SocialPlatform.LinkedIn));
    }
    
    /// <summary>
    /// Sets up all recurring jobs. Should be called once at application startup.
    /// </summary>
    public void SetupRecurringJobs()
    {
        _logger.LogInformation("Setting up recurring jobs");
        
        // Publish scheduled posts every 5 minutes
        var publishingInterval = _configuration.GetValue<string>("Jobs:PublishingInterval", "*/5 * * * *");
        _recurringJobManager.AddOrUpdate<PostPublishingJob>(
            "publish-scheduled-posts",
            job => job.PublishScheduledPosts(),
            publishingInterval);
        _logger.LogInformation("Configured post publishing job with interval: {Interval}", publishingInterval);
        
        // Retry failed posts every hour
        var retryInterval = _configuration.GetValue<string>("Jobs:RetryFailedInterval", "0 * * * *");
        _recurringJobManager.AddOrUpdate<PostPublishingJob>(
            "retry-failed-posts",
            job => job.RetryFailedPosts(),
            retryInterval);
        _logger.LogInformation("Configured retry failed posts job with interval: {Interval}", retryInterval);
        
        // Cleanup old projects daily at 2 AM
        var cleanupInterval = _configuration.GetValue<string>("Jobs:CleanupInterval", "0 2 * * *");
        _recurringJobManager.AddOrUpdate<ProjectCleanupJob>(
            "cleanup-old-projects",
            job => job.CleanupOldProjects(),
            cleanupInterval);
        _logger.LogInformation("Configured project cleanup job with interval: {Interval}", cleanupInterval);
        
        // Extract insights from new transcripts every 15 minutes
        var insightExtractionInterval = _configuration.GetValue<string>("Jobs:InsightExtractionInterval", "*/15 * * * *");
        _recurringJobManager.AddOrUpdate<InsightExtractionJob>(
            "extract-insights",
            job => job.ExtractInsightsFromTranscripts(),
            insightExtractionInterval);
        _logger.LogInformation("Configured insight extraction job with interval: {Interval}", insightExtractionInterval);
        
        // Generate posts from new insights every 20 minutes
        var postGenerationInterval = _configuration.GetValue<string>("Jobs:PostGenerationInterval", "*/20 * * * *");
        _recurringJobManager.AddOrUpdate<PostGenerationJob>(
            "generate-posts",
            job => job.GeneratePostsFromInsights(),
            postGenerationInterval);
        _logger.LogInformation("Configured post generation job with interval: {Interval}", postGenerationInterval);
        
        _logger.LogInformation("All recurring jobs configured successfully");
    }
}