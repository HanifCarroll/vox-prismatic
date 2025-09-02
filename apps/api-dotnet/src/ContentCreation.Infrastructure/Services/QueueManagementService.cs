using Microsoft.Extensions.Logging;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.DTOs.Queue;
using Hangfire;

namespace ContentCreation.Infrastructure.Services;

/// <summary>
/// Basic queue management service for content pipeline background jobs.
/// Supports the required pipeline stages: process-content, extract-insights, 
/// generate-posts, schedule-posts, and publish-now.
/// </summary>
public class QueueManagementService : IQueueManagementService
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IRecurringJobManager _recurringJobManager;
    private readonly ILogger<QueueManagementService> _logger;

    public QueueManagementService(
        IBackgroundJobClient backgroundJobClient,
        IRecurringJobManager recurringJobManager,
        ILogger<QueueManagementService> logger)
    {
        _backgroundJobClient = backgroundJobClient;
        _recurringJobManager = recurringJobManager;
        _logger = logger;
    }

    /// <summary>
    /// Enqueue a job for immediate processing in the content pipeline.
    /// Used for process-content, extract-insights, generate-posts actions.
    /// </summary>
    public async Task<string> EnqueueJobAsync<T>(Func<T, Task> job, T data, string? queue = null)
    {
        _logger.LogInformation("Enqueuing job of type {JobType}", typeof(T).Name);
        
        string jobId;
        if (string.IsNullOrEmpty(queue))
        {
            jobId = _backgroundJobClient.Enqueue(() => job(data));
        }
        else
        {
            jobId = _backgroundJobClient.Enqueue(queue, () => job(data));
        }
        
        _logger.LogInformation("Enqueued job {JobId} to queue {Queue}", jobId, queue ?? "default");
        return await Task.FromResult(jobId);
    }

    /// <summary>
    /// Schedule a job for future execution.
    /// Used for schedule-posts action for LinkedIn publishing.
    /// </summary>
    public async Task<string> ScheduleJobAsync<T>(Func<T, Task> job, T data, DateTimeOffset scheduleTime)
    {
        _logger.LogInformation("Scheduling job of type {JobType} for {ScheduleTime}", 
            typeof(T).Name, scheduleTime);
        
        var jobId = _backgroundJobClient.Schedule(() => job(data), scheduleTime);
        
        _logger.LogInformation("Scheduled job {JobId} for {ScheduleTime}", jobId, scheduleTime);
        return await Task.FromResult(jobId);
    }

    /// <summary>
    /// Create a recurring job with a cron expression.
    /// May be used for periodic content processing or publishing tasks.
    /// </summary>
    public async Task<string> RecurringJobAsync(string jobId, Func<Task> job, string cronExpression)
    {
        _logger.LogInformation("Creating recurring job {JobId} with cron {Cron}", jobId, cronExpression);
        
        _recurringJobManager.AddOrUpdate(jobId, () => job(), cronExpression);
        
        _logger.LogInformation("Created recurring job {JobId}", jobId);
        return await Task.FromResult(jobId);
    }

    public async Task<QueueStatsDto> GetQueueStatsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting queue stats for queue: {Queue}", queue ?? "all");
        
        // Return mock stats for now - would integrate with Hangfire monitoring API
        return await Task.FromResult(new QueueStatsDto
        {
            PendingCount = 0,
            ProcessingCount = 0,
            CompletedCount = 0,
            FailedCount = 0,
            TotalCount = 0,
            QueueName = queue,
            LastUpdated = DateTime.UtcNow
        });
    }

    public async Task<List<JobDto>> GetPendingJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting pending jobs for queue: {Queue}", queue ?? "all");
        return await Task.FromResult(new List<JobDto>());
    }

    public async Task<List<JobDto>> GetProcessingJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting processing jobs for queue: {Queue}", queue ?? "all");
        return await Task.FromResult(new List<JobDto>());
    }

    public async Task<List<JobDto>> GetFailedJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting failed jobs for queue: {Queue}", queue ?? "all");
        return await Task.FromResult(new List<JobDto>());
    }

    public async Task<List<JobDto>> GetCompletedJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting completed jobs for queue: {Queue}", queue ?? "all");
        return await Task.FromResult(new List<JobDto>());
    }

    public async Task<JobDetailsDto> GetJobDetailsAsync(string jobId)
    {
        _logger.LogInformation("Getting job details for job: {JobId}", jobId);
        
        // Return mock details for now
        return await Task.FromResult(new JobDetailsDto
        {
            Id = jobId,
            Type = "Unknown",
            Status = "Unknown",
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<JobStatus> GetJobStatusAsync(string jobId)
    {
        _logger.LogInformation("Getting job status for job: {JobId}", jobId);
        return await Task.FromResult(JobStatus.Pending);
    }

    public async Task<bool> RetryJobAsync(string jobId)
    {
        _logger.LogInformation("Retrying job: {JobId}", jobId);
        
        try
        {
            _backgroundJobClient.Requeue(jobId);
            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retry job {JobId}", jobId);
            return await Task.FromResult(false);
        }
    }

    public async Task<bool> CancelJobAsync(string jobId)
    {
        _logger.LogInformation("Cancelling job: {JobId}", jobId);
        
        try
        {
            _backgroundJobClient.Delete(jobId);
            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel job {JobId}", jobId);
            return await Task.FromResult(false);
        }
    }

    public async Task<bool> RequeueJobAsync(string jobId)
    {
        _logger.LogInformation("Requeueing job: {JobId}", jobId);
        
        try
        {
            _backgroundJobClient.Requeue(jobId);
            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to requeue job {JobId}", jobId);
            return await Task.FromResult(false);
        }
    }

    public async Task<bool> DeleteJobAsync(string jobId)
    {
        _logger.LogInformation("Deleting job: {JobId}", jobId);
        
        try
        {
            _backgroundJobClient.Delete(jobId);
            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete job {JobId}", jobId);
            return await Task.FromResult(false);
        }
    }
}