using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.DTOs.Queue;

namespace ContentCreation.Core.Interfaces;

public interface IBackgroundJobService
{
    // Transcript Processing Jobs
    Task ProcessTranscriptAsync(string transcriptId);
    Task CleanTranscriptAsync(string transcriptId);
    Task ExtractTranscriptMetadataAsync(string transcriptId);
    
    // Insight Generation Jobs
    Task GenerateInsightsFromTranscriptAsync(string transcriptId);
    Task GenerateInsightAsync(string transcriptId, string insightType);
    Task ReviewInsightAsync(string insightId);
    Task ApproveInsightAsync(string insightId);
    
    // Post Generation Jobs
    Task GeneratePostsFromInsightAsync(string insightId);
    Task GeneratePostAsync(string insightId, string platform);
    Task OptimizePostContentAsync(string postId);
    Task SchedulePostAsync(string postId, DateTime scheduledTime);
    
    // Publishing Jobs
    Task PublishPostAsync(string postId);
    Task PublishToLinkedInAsync(string postId);
    Task RetryFailedPublishAsync(string postId);
    
    // Analytics Jobs
    Task CollectPostMetricsAsync(string postId);
    Task GenerateProjectAnalyticsAsync(string projectId);
    Task UpdateEngagementMetricsAsync(string postId);
    
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
    public string Id { get; set; } = string.Empty;
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