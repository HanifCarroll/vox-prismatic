using Microsoft.Extensions.Logging;
using ContentCreation.Core.Interfaces;
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
}