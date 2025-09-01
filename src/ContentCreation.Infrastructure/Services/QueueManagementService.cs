using Microsoft.Extensions.Logging;
using ContentCreation.Core.Interfaces;
using Hangfire;
using Hangfire.Storage;
using Hangfire.Storage.Monitoring;

namespace ContentCreation.Infrastructure.Services;

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

    // Queue Management
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

    public async Task<string> ScheduleJobAsync<T>(Func<T, Task> job, T data, DateTimeOffset scheduleTime)
    {
        _logger.LogInformation("Scheduling job of type {JobType} for {ScheduleTime}", 
            typeof(T).Name, scheduleTime);
        
        var jobId = _backgroundJobClient.Schedule(() => job(data), scheduleTime);
        
        _logger.LogInformation("Scheduled job {JobId} for {ScheduleTime}", jobId, scheduleTime);
        return await Task.FromResult(jobId);
    }

    public async Task<string> RecurringJobAsync(string jobId, Func<Task> job, string cronExpression)
    {
        _logger.LogInformation("Creating recurring job {JobId} with cron {Cron}", jobId, cronExpression);
        
        _recurringJobManager.AddOrUpdate(jobId, () => job(), cronExpression);
        
        _logger.LogInformation("Created recurring job {JobId}", jobId);
        return await Task.FromResult(jobId);
    }

    public async Task<bool> DeleteJobAsync(string jobId)
    {
        _logger.LogInformation("Deleting job {JobId}", jobId);
        
        var result = _backgroundJobClient.Delete(jobId);
        
        if (result)
        {
            _logger.LogInformation("Deleted job {JobId}", jobId);
        }
        else
        {
            _logger.LogWarning("Failed to delete job {JobId}", jobId);
        }
        
        return await Task.FromResult(result);
    }

    public async Task<bool> RequeueJobAsync(string jobId)
    {
        _logger.LogInformation("Requeuing job {JobId}", jobId);
        
        var result = _backgroundJobClient.Requeue(jobId);
        
        if (result)
        {
            _logger.LogInformation("Requeued job {JobId}", jobId);
        }
        else
        {
            _logger.LogWarning("Failed to requeue job {JobId}", jobId);
        }
        
        return await Task.FromResult(result);
    }

    // Queue Monitoring
    public async Task<QueueStatsDto> GetQueueStatsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting queue stats for {Queue}", queue ?? "all queues");
        
        using var connection = JobStorage.Current.GetConnection();
        var monitor = connection.GetMonitoringApi();
        var stats = monitor.GetStatistics();
        
        var queueStats = new QueueStatsDto
        {
            PendingJobs = (int)stats.Enqueued,
            ProcessingJobs = (int)stats.Processing,
            CompletedJobs = (int)stats.Succeeded,
            FailedJobs = (int)stats.Failed,
            ScheduledJobs = (int)stats.Scheduled,
            AverageProcessingTime = 0, // Would need custom tracking
            LastJobCompletedAt = DateTime.UtcNow, // Would need custom tracking
            JobsByType = new Dictionary<string, int>()
        };
        
        // Get queue-specific stats if requested
        if (!string.IsNullOrEmpty(queue))
        {
            var queueData = monitor.Queues()
                .FirstOrDefault(q => q.Name.Equals(queue, StringComparison.OrdinalIgnoreCase));
                
            if (queueData != null)
            {
                queueStats.PendingJobs = queueData.Length;
            }
        }
        
        return await Task.FromResult(queueStats);
    }

    public async Task<List<JobDto>> GetPendingJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting pending jobs for {Queue}", queue ?? "all queues");
        
        using var connection = JobStorage.Current.GetConnection();
        var monitor = connection.GetMonitoringApi();
        
        var enqueuedJobs = monitor.EnqueuedJobs(queue ?? "default", 0, 100);
        
        var jobs = enqueuedJobs.Select(job => new JobDto
        {
            Id = job.Key,
            Type = job.Value.Job?.Type?.Name ?? "Unknown",
            Queue = job.Value.InEnqueuedState ? job.Value.State : queue ?? "default",
            Status = JobStatus.Pending,
            CreatedAt = job.Value.EnqueuedAt ?? DateTime.UtcNow,
            RetryCount = 0,
            Data = new Dictionary<string, object>()
        }).ToList();
        
        return await Task.FromResult(jobs);
    }

    public async Task<List<JobDto>> GetProcessingJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting processing jobs");
        
        using var connection = JobStorage.Current.GetConnection();
        var monitor = connection.GetMonitoringApi();
        
        var processingJobs = monitor.ProcessingJobs(0, 100);
        
        var jobs = processingJobs.Select(job => new JobDto
        {
            Id = job.Key,
            Type = job.Value.Job?.Type?.Name ?? "Unknown",
            Queue = queue ?? "default",
            Status = JobStatus.Processing,
            CreatedAt = job.Value.StartedAt ?? DateTime.UtcNow,
            StartedAt = job.Value.StartedAt,
            RetryCount = 0,
            Data = new Dictionary<string, object>()
        }).ToList();
        
        return await Task.FromResult(jobs);
    }

    public async Task<List<JobDto>> GetFailedJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting failed jobs");
        
        using var connection = JobStorage.Current.GetConnection();
        var monitor = connection.GetMonitoringApi();
        
        var failedJobs = monitor.FailedJobs(0, 100);
        
        var jobs = failedJobs.Select(job => new JobDto
        {
            Id = job.Key,
            Type = job.Value.Job?.Type?.Name ?? "Unknown",
            Queue = queue ?? "default",
            Status = JobStatus.Failed,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = job.Value.FailedAt,
            Error = job.Value.ExceptionMessage,
            RetryCount = 0,
            Data = new Dictionary<string, object>()
        }).ToList();
        
        return await Task.FromResult(jobs);
    }

    public async Task<List<JobDto>> GetCompletedJobsAsync(string? queue = null)
    {
        _logger.LogInformation("Getting completed jobs");
        
        using var connection = JobStorage.Current.GetConnection();
        var monitor = connection.GetMonitoringApi();
        
        var succeededJobs = monitor.SucceededJobs(0, 100);
        
        var jobs = succeededJobs.Select(job => new JobDto
        {
            Id = job.Key,
            Type = job.Value.Job?.Type?.Name ?? "Unknown",
            Queue = queue ?? "default",
            Status = JobStatus.Completed,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = job.Value.SucceededAt,
            RetryCount = 0,
            Data = new Dictionary<string, object>()
        }).ToList();
        
        return await Task.FromResult(jobs);
    }

    // Job Status
    public async Task<JobDetailsDto> GetJobDetailsAsync(string jobId)
    {
        _logger.LogInformation("Getting details for job {JobId}", jobId);
        
        using var connection = JobStorage.Current.GetConnection();
        var jobData = connection.GetJobData(jobId);
        
        if (jobData == null)
        {
            throw new KeyNotFoundException($"Job {jobId} not found");
        }
        
        var details = new JobDetailsDto
        {
            Id = jobId,
            Type = jobData.Job?.Type?.Name ?? "Unknown",
            Queue = "default",
            Status = ParseJobState(jobData.State),
            CreatedAt = jobData.CreatedAt,
            Data = new Dictionary<string, object>(),
            Metadata = new Dictionary<string, object>(),
            Logs = new List<string>(),
            ChildJobIds = new List<string>()
        };
        
        // Add state-specific data
        if (jobData.State == "Failed")
        {
            var failedState = jobData.LoadedState as FailedState;
            if (failedState != null)
            {
                details.Error = failedState.Reason;
                details.StackTrace = failedState.ExceptionDetails;
                details.CompletedAt = failedState.FailedAt;
            }
        }
        else if (jobData.State == "Succeeded")
        {
            var succeededState = jobData.LoadedState as SucceededState;
            if (succeededState != null)
            {
                details.CompletedAt = succeededState.SucceededAt;
            }
        }
        else if (jobData.State == "Processing")
        {
            var processingState = jobData.LoadedState as ProcessingState;
            if (processingState != null)
            {
                details.StartedAt = processingState.StartedAt;
            }
        }
        
        return await Task.FromResult(details);
    }

    public async Task<bool> IsJobRunningAsync(string jobId)
    {
        _logger.LogInformation("Checking if job {JobId} is running", jobId);
        
        using var connection = JobStorage.Current.GetConnection();
        var jobData = connection.GetJobData(jobId);
        
        var isRunning = jobData?.State == "Processing";
        
        return await Task.FromResult(isRunning);
    }

    public async Task<JobStatus> GetJobStatusAsync(string jobId)
    {
        _logger.LogInformation("Getting status for job {JobId}", jobId);
        
        using var connection = JobStorage.Current.GetConnection();
        var jobData = connection.GetJobData(jobId);
        
        if (jobData == null)
        {
            throw new KeyNotFoundException($"Job {jobId} not found");
        }
        
        var status = ParseJobState(jobData.State);
        
        return await Task.FromResult(status);
    }

    private JobStatus ParseJobState(string? state)
    {
        return state?.ToLower() switch
        {
            "enqueued" => JobStatus.Pending,
            "processing" => JobStatus.Processing,
            "succeeded" => JobStatus.Completed,
            "failed" => JobStatus.Failed,
            "deleted" => JobStatus.Cancelled,
            "scheduled" => JobStatus.Scheduled,
            _ => JobStatus.Pending
        };
    }
}