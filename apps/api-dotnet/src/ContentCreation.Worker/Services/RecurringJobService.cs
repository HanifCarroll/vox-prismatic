using Hangfire;
using Hangfire.Storage;
using ContentCreation.Worker.Jobs;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ContentCreation.Worker.Services;

public class RecurringJobService : BackgroundService
{
    private readonly ILogger<RecurringJobService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly IRecurringJobManager _recurringJobManager;

    public RecurringJobService(
        ILogger<RecurringJobService> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        IRecurringJobManager recurringJobManager)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _recurringJobManager = recurringJobManager;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recurring job service started");
        
        ConfigureRecurringJobs();
        
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            
            await MonitorJobHealth(stoppingToken);
        }
        
        _logger.LogInformation("Recurring job service stopping");
    }

    private void ConfigureRecurringJobs()
    {
        _logger.LogInformation("Configuring recurring jobs");
        
        var publishingInterval = _configuration.GetValue<string>("Jobs:PublishingInterval", "*/5 * * * *");
        _recurringJobManager.AddOrUpdate<PostPublishingJob>(
            "publish-scheduled-posts",
            job => job.PublishScheduledPosts(),
            publishingInterval);
        _logger.LogInformation("Configured post publishing job with interval: {Interval}", publishingInterval);
        
        var retryInterval = _configuration.GetValue<string>("Jobs:RetryFailedInterval", "0 * * * *");
        _recurringJobManager.AddOrUpdate<PostPublishingJob>(
            "retry-failed-posts",
            job => job.RetryFailedPosts(),
            retryInterval);
        _logger.LogInformation("Configured retry failed posts job with interval: {Interval}", retryInterval);
        
        var cleanupInterval = _configuration.GetValue<string>("Jobs:CleanupInterval", "0 2 * * *");
        _recurringJobManager.AddOrUpdate<ProjectCleanupJob>(
            "cleanup-old-projects",
            job => job.CleanupOldProjects(),
            cleanupInterval);
        _logger.LogInformation("Configured project cleanup job with interval: {Interval}", cleanupInterval);
        
        var contentProcessingInterval = _configuration.GetValue<string>("Jobs:ContentProcessingInterval", "*/10 * * * *");
        // Note: ProcessContentJob requires specific project/content parameters, typically triggered on-demand
        // rather than as a recurring job. Commenting out for now.
        // _recurringJobManager.AddOrUpdate<ProcessContentJob>(
        //     "process-content",
        //     job => job.ProcessContent(projectId, contentUrl, contentType),
        //     contentProcessingInterval);
        _logger.LogInformation("Content processing jobs are triggered on-demand rather than recurring");
        
        var insightExtractionInterval = _configuration.GetValue<string>("Jobs:InsightExtractionInterval", "*/15 * * * *");
        _recurringJobManager.AddOrUpdate<InsightExtractionJob>(
            "extract-insights",
            job => job.ExtractInsightsFromTranscripts(),
            insightExtractionInterval);
        _logger.LogInformation("Configured insight extraction job with interval: {Interval}", insightExtractionInterval);
        
        var postGenerationInterval = _configuration.GetValue<string>("Jobs:PostGenerationInterval", "*/20 * * * *");
        _recurringJobManager.AddOrUpdate<PostGenerationJob>(
            "generate-posts",
            job => job.GeneratePostsFromInsights(),
            postGenerationInterval);
        _logger.LogInformation("Configured post generation job with interval: {Interval}", postGenerationInterval);
        
        var analyticsInterval = _configuration.GetValue<string>("Jobs:AnalyticsInterval", "0 */6 * * *");
        _recurringJobManager.AddOrUpdate<AnalyticsJob>(
            "update-analytics",
            job => job.UpdateProjectAnalytics(),
            analyticsInterval);
        _logger.LogInformation("Configured analytics update job with interval: {Interval}", analyticsInterval);
        
        var healthCheckInterval = _configuration.GetValue<string>("Jobs:HealthCheckInterval", "*/30 * * * *");
        _recurringJobManager.AddOrUpdate<HealthCheckJob>(
            "health-check",
            job => job.PerformHealthCheck(),
            healthCheckInterval);
        _logger.LogInformation("Configured health check job with interval: {Interval}", healthCheckInterval);
    }

    private Task MonitorJobHealth(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var jobStorage = scope.ServiceProvider.GetService<JobStorage>();
        
        if (jobStorage == null)
        {
            _logger.LogWarning("Job storage not available for health monitoring");
            return Task.CompletedTask;
        }
        
        try
        {
            using var connection = jobStorage.GetConnection();
            var recurringJobs = connection.GetRecurringJobs();
            
            foreach (var job in recurringJobs)
            {
                if (job.LastExecution.HasValue)
                {
                    var timeSinceLastExecution = DateTime.UtcNow - job.LastExecution.Value;
                    
                    var expectedInterval = GetExpectedInterval(job.Id);
                    
                    if (timeSinceLastExecution > expectedInterval.Multiply(2))
                    {
                        _logger.LogWarning("Job {JobId} hasn't executed in {Time}. Expected interval: {Expected}",
                            job.Id, timeSinceLastExecution, expectedInterval);
                        
                        if (ShouldRestartJob(job.Id, timeSinceLastExecution))
                        {
                            _logger.LogInformation("Restarting stalled job: {JobId}", job.Id);
                            RestartJob(job.Id);
                        }
                    }
                }
                
                if (job.LastJobState == "Failed" && job.Error != null)
                {
                    _logger.LogError("Job {JobId} is in failed state: {Error}", job.Id, job.Error);
                    
                    if (ShouldRetryFailedJob(job.Id))
                    {
                        _logger.LogInformation("Triggering retry for failed job: {JobId}", job.Id);
                        _recurringJobManager.Trigger(job.Id);
                    }
                }
            }
            
            // Check queue sizes using monitoring API
            var monitoringApi = JobStorage.Current.GetMonitoringApi();
            var queues = monitoringApi.Queues();
            var criticalQueue = queues.FirstOrDefault(q => q.Name == "critical");
            if (criticalQueue != null && criticalQueue.Length > 100)
            {
                _logger.LogWarning("Critical queue has {Count} enqueued jobs - may indicate processing issues", criticalQueue.Length);
            }
            
            var failedJobs = monitoringApi.FailedCount();
            if (failedJobs > 50)
            {
                _logger.LogWarning("Failed job count is high: {Count}", failedJobs);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error monitoring job health");
        }
        
        return Task.CompletedTask;
    }

    private TimeSpan GetExpectedInterval(string jobId)
    {
        return jobId switch
        {
            "publish-scheduled-posts" => TimeSpan.FromMinutes(5),
            "retry-failed-posts" => TimeSpan.FromHours(1),
            "cleanup-old-projects" => TimeSpan.FromDays(1),
            "process-content" => TimeSpan.FromMinutes(10),
            "extract-insights" => TimeSpan.FromMinutes(15),
            "generate-posts" => TimeSpan.FromMinutes(20),
            "update-analytics" => TimeSpan.FromHours(6),
            "health-check" => TimeSpan.FromMinutes(30),
            _ => TimeSpan.FromHours(1)
        };
    }

    private bool ShouldRestartJob(string jobId, TimeSpan timeSinceLastExecution)
    {
        var criticalJobs = new[] { "publish-scheduled-posts", "health-check" };
        
        if (criticalJobs.Contains(jobId))
        {
            var expectedInterval = GetExpectedInterval(jobId);
            return timeSinceLastExecution > expectedInterval.Multiply(3);
        }
        
        return timeSinceLastExecution > TimeSpan.FromHours(24);
    }

    private bool ShouldRetryFailedJob(string jobId)
    {
        var autoRetryJobs = new[] 
        { 
            "publish-scheduled-posts", 
            "retry-failed-posts",
            "health-check"
        };
        
        return autoRetryJobs.Contains(jobId);
    }

    private void RestartJob(string jobId)
    {
        try
        {
            _recurringJobManager.RemoveIfExists(jobId);
            
            switch (jobId)
            {
                case "publish-scheduled-posts":
                    _recurringJobManager.AddOrUpdate<PostPublishingJob>(
                        jobId,
                        job => job.PublishScheduledPosts(),
                        "*/5 * * * *");
                    break;
                    
                case "health-check":
                    _recurringJobManager.AddOrUpdate<HealthCheckJob>(
                        jobId,
                        job => job.PerformHealthCheck(),
                        "*/30 * * * *");
                    break;
                    
                default:
                    _logger.LogWarning("Unknown job ID for restart: {JobId}", jobId);
                    break;
            }
            
            _logger.LogInformation("Successfully restarted job: {JobId}", jobId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restart job: {JobId}", jobId);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping recurring job service");
        
        var criticalJobs = new[] { "publish-scheduled-posts" };
        
        foreach (var jobId in criticalJobs)
        {
            try
            {
                _logger.LogInformation("Ensuring {JobId} completes before shutdown", jobId);
                
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(30));
                
                while (!cts.Token.IsCancellationRequested)
                {
                    using var scope = _serviceProvider.CreateScope();
                    var jobStorage = scope.ServiceProvider.GetService<JobStorage>();
                    
                    if (jobStorage != null)
                    {
                        var monitoringApi = jobStorage.GetMonitoringApi();
                        var processingJobs = monitoringApi.ProcessingCount();
                        
                        if (processingJobs == 0)
                        {
                            break;
                        }
                        
                        _logger.LogInformation("Waiting for {Count} {JobId} jobs to complete", processingJobs, jobId);
                    }
                    
                    await Task.Delay(1000, cts.Token);
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Timeout waiting for {JobId} to complete", jobId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during graceful shutdown for {JobId}", jobId);
            }
        }
        
        await base.StopAsync(cancellationToken);
    }
}

public class AnalyticsJob
{
    private readonly ILogger<AnalyticsJob> _logger;

    public AnalyticsJob(ILogger<AnalyticsJob> logger)
    {
        _logger = logger;
    }

    public async Task UpdateProjectAnalytics()
    {
        _logger.LogInformation("Updating project analytics");
        await Task.CompletedTask;
    }
}

public class HealthCheckJob
{
    private readonly ILogger<HealthCheckJob> _logger;
    private readonly IServiceProvider _serviceProvider;

    public HealthCheckJob(
        ILogger<HealthCheckJob> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public async Task PerformHealthCheck()
    {
        _logger.LogInformation("Performing system health check");
        
        using var scope = _serviceProvider.CreateScope();
        
        var healthChecks = new Dictionary<string, bool>
        {
            { "Database", await CheckDatabaseHealth(scope) },
            { "ExternalAPIs", await CheckExternalAPIs(scope) }
        };
        
        foreach (var check in healthChecks)
        {
            if (!check.Value)
            {
                _logger.LogError("Health check failed: {Component}", check.Key);
            }
        }
        
        if (healthChecks.All(c => c.Value))
        {
            _logger.LogInformation("All health checks passed");
        }
    }

    private async Task<bool> CheckDatabaseHealth(IServiceScope scope)
    {
        try
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await context.Database.CanConnectAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");
            return false;
        }
    }

    private async Task<bool> CheckExternalAPIs(IServiceScope scope)
    {
        try
        {
            var publishingService = scope.ServiceProvider.GetService<IPublishingService>();
            if (publishingService != null)
            {
                // Check connection for LinkedIn (primary platform for Phase 1)
                return await publishingService.TestConnectionAsync("linkedin");
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "External API health check failed");
            return false;
        }
    }
}