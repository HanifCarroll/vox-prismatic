using Hangfire;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Worker.Services;

public class RecurringJobService : BackgroundService
{
    private readonly ILogger<RecurringJobService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public RecurringJobService(
        ILogger<RecurringJobService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Recurring job service started");
        
        // The recurring jobs are already configured in Program.cs
        // This service just keeps the application running
        
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
        
        _logger.LogInformation("Recurring job service stopping");
    }
}