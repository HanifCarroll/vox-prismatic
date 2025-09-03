using ContentCreation.Api.Features.Common.DTOs.Transcripts;
using ContentCreation.Api.Features.Common.DTOs.Insights;
using ContentCreation.Api.Features.Common.DTOs.Posts;
using ContentCreation.Api.Features.Common.DTOs.Queue;

namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IBackgroundJobService
{
    // Queue Methods for Feature Slices
    string QueueContentProcessing(Guid projectId);
    string QueueInsightExtraction(Guid projectId, bool autoApprove = false);
    string QueuePostGeneration(Guid projectId, string platform = "LinkedIn", bool autoApprove = false);
    
    // Transcript Processing Jobs
    Task ProcessTranscriptAsync(Guid transcriptId);
    Task CleanTranscriptAsync(Guid transcriptId);
    Task ExtractTranscriptMetadataAsync(Guid transcriptId);
    
    // Insight Generation Jobs
    Task GenerateInsightsFromTranscriptAsync(Guid transcriptId);
    Task GenerateInsightAsync(Guid transcriptId, string insightType);
    Task ReviewInsightAsync(Guid insightId);
    Task ApproveInsightAsync(Guid insightId);
    
    // Post Generation Jobs
    Task GeneratePostsFromInsightAsync(Guid insightId);
    Task GeneratePostAsync(Guid insightId, string platform);
    Task OptimizePostContentAsync(Guid postId);
    Task SchedulePostAsync(Guid postId, DateTime scheduledTime);
    
    // Publishing Jobs
    Task PublishPostAsync(Guid postId);
    Task PublishToLinkedInAsync(Guid postId);
    Task RetryFailedPublishAsync(Guid postId);
    
    // Analytics Jobs
    Task CollectPostMetricsAsync(Guid postId);
    Task GenerateProjectAnalyticsAsync(Guid projectId);
    Task UpdateEngagementMetricsAsync(Guid postId);
    
    // Cleanup Jobs
    Task CleanupOldJobsAsync();
    Task ArchiveCompletedProjectsAsync();
    Task PurgeExpiredDataAsync();
}
