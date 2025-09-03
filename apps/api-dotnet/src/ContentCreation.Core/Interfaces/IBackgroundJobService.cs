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

/// <summary>
/// Basic queue management interface for content pipeline background jobs.
/// Supports the required pipeline stages as defined in technical requirements.
/// </summary>
public interface IQueueManagementService
{
    /// <summary>
    /// Enqueue a job for immediate processing (process-content, extract-insights, generate-posts).
    /// </summary>
    Task<string> EnqueueJobAsync<T>(Func<T, Task> job, T data, string? queue = null);
    
    /// <summary>
    /// Schedule a job for future execution (schedule-posts for LinkedIn).
    /// </summary>
    Task<string> ScheduleJobAsync<T>(Func<T, Task> job, T data, DateTimeOffset scheduleTime);
    
    /// <summary>
    /// Create a recurring job (periodic processing tasks).
    /// </summary>
    Task<string> RecurringJobAsync(string jobId, Func<Task> job, string cronExpression);
    
    /// <summary>
    /// Get queue statistics.
    /// </summary>
    Task<QueueStatsDto> GetQueueStatsAsync(string? queue = null);
    
    /// <summary>
    /// Get pending jobs.
    /// </summary>
    Task<List<JobDto>> GetPendingJobsAsync(string? queue = null);
    
    /// <summary>
    /// Get processing jobs.
    /// </summary>
    Task<List<JobDto>> GetProcessingJobsAsync(string? queue = null);
    
    /// <summary>
    /// Get failed jobs.
    /// </summary>
    Task<List<JobDto>> GetFailedJobsAsync(string? queue = null);
    
    /// <summary>
    /// Get completed jobs.
    /// </summary>
    Task<List<JobDto>> GetCompletedJobsAsync(string? queue = null);
    
    /// <summary>
    /// Get job details.
    /// </summary>
    Task<JobDetailsDto> GetJobDetailsAsync(string jobId);
    
    /// <summary>
    /// Get job status.
    /// </summary>
    Task<JobStatus> GetJobStatusAsync(string jobId);
    
    /// <summary>
    /// Retry a failed job.
    /// </summary>
    Task<bool> RetryJobAsync(string jobId);
    
    /// <summary>
    /// Cancel a job.
    /// </summary>
    Task<bool> CancelJobAsync(string jobId);
    
    /// <summary>
    /// Requeue a job.
    /// </summary>
    Task<bool> RequeueJobAsync(string jobId);
    
    /// <summary>
    /// Delete a job.
    /// </summary>
    Task<bool> DeleteJobAsync(string jobId);
}

// Basic DTOs kept for potential future use in pipeline status tracking
public class JobDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Queue { get; set; } = string.Empty;
    public JobStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Error { get; set; }
    public int RetryCount { get; set; }
    public Dictionary<string, object> Data { get; set; } = new();
}

public enum JobStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
    Scheduled
}