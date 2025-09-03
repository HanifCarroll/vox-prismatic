using Hangfire;
using ContentCreation.Api.Features.BackgroundJobs;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common;


public class MinimalBackgroundJobService
{
    private readonly IBackgroundJobClient _jobClient;
    private readonly ILogger<MinimalBackgroundJobService> _logger;

    public MinimalBackgroundJobService(
        IBackgroundJobClient jobClient,
        ILogger<MinimalBackgroundJobService> logger)
    {
        _jobClient = jobClient;
        _logger = logger;
    }

    // Queue Methods for Background Jobs
    public string QueueContentProcessing(Guid projectId, string contentUrl = "", string contentType = "audio")
    {
        _logger.LogInformation("Queuing content processing for project {ProjectId}", projectId);
        return _jobClient.Enqueue<ProcessContentJob>(job => job.ProcessContent(projectId, contentUrl, contentType));
    }

    public string QueueInsightExtraction(Guid projectId, bool autoApprove = false)
    {
        _logger.LogInformation("Queuing insight extraction for project {ProjectId}", projectId);
        return _jobClient.Enqueue<InsightExtractionJob>(job => job.ExtractInsights(projectId));
    }

    public string QueuePostGeneration(Guid projectId, string platform = "LinkedIn", bool autoApprove = false)
    {
        _logger.LogInformation("Queuing post generation for project {ProjectId} on {Platform}", projectId, platform);
        return _jobClient.Enqueue<PostGenerationJob>(job => job.GeneratePosts(projectId, null));
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
        return _jobClient.Enqueue<PublishNowJob>(job => job.PublishImmediately(postId, SocialPlatform.LinkedIn.ToApiString()));
    }
}