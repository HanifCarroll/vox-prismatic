using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.DTOs.Posts;

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

public interface IQueueManagementService
{
    // Queue Management
    Task<string> EnqueueJobAsync<T>(Func<T, Task> job, T data, string? queue = null);
    Task<string> ScheduleJobAsync<T>(Func<T, Task> job, T data, DateTimeOffset scheduleTime);
    Task<string> RecurringJobAsync(string jobId, Func<Task> job, string cronExpression);
    Task<bool> DeleteJobAsync(string jobId);
    Task<bool> RequeueJobAsync(string jobId);
    
    // Queue Monitoring
    Task<QueueStatsDto> GetQueueStatsAsync(string? queue = null);
    Task<List<JobDto>> GetPendingJobsAsync(string? queue = null);
    Task<List<JobDto>> GetProcessingJobsAsync(string? queue = null);
    Task<List<JobDto>> GetFailedJobsAsync(string? queue = null);
    Task<List<JobDto>> GetCompletedJobsAsync(string? queue = null);
    
    // Job Status
    Task<JobDetailsDto> GetJobDetailsAsync(string jobId);
    Task<bool> IsJobRunningAsync(string jobId);
    Task<JobStatus> GetJobStatusAsync(string jobId);
}

public class QueueStatsDto
{
    public int PendingJobs { get; set; }
    public int ProcessingJobs { get; set; }
    public int CompletedJobs { get; set; }
    public int FailedJobs { get; set; }
    public int ScheduledJobs { get; set; }
    public double AverageProcessingTime { get; set; }
    public DateTime LastJobCompletedAt { get; set; }
    public Dictionary<string, int> JobsByType { get; set; } = new();
}

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

public class JobDetailsDto : JobDto
{
    public string? StackTrace { get; set; }
    public List<string> Logs { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
    public string? ParentJobId { get; set; }
    public List<string> ChildJobIds { get; set; } = new();
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