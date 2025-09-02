using ContentCreation.Infrastructure.Data;
using ContentCreation.Infrastructure.Services;
using ContentCreation.Worker.Jobs;
using ContentCreation.Worker.Services;
using ContentCreation.Core.Interfaces;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = Host.CreateApplicationBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.Console()
    .WriteTo.File("logs/worker-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Services.AddSerilog();

// Configure database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Host=localhost;Database=content_creation;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Hangfire
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(connectionString)));

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = Environment.ProcessorCount * 2;
    options.Queues = new[] { "critical", "default", "low" };
});

// Register services
builder.Services.AddAutoMapper(typeof(Program).Assembly);
builder.Services.AddScoped<IContentProjectService, ContentProjectService>();
builder.Services.AddScoped<ITranscriptService, TranscriptService>();
builder.Services.AddScoped<IInsightService, InsightService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<ISocialPostPublisher, PublishingService>();
builder.Services.AddScoped<IPublishingService, PublishingService>();
builder.Services.AddScoped<IAIService, AIService>();
builder.Services.AddScoped<IDeepgramService, DeepgramService>();
builder.Services.AddScoped<ILinkedInService, LinkedInService>();

// Register background job processors
builder.Services.AddScoped<ProcessContentJob>();
builder.Services.AddScoped<InsightExtractionJob>();
builder.Services.AddScoped<PostGenerationJob>();
builder.Services.AddScoped<PostPublishingJob>();
builder.Services.AddScoped<SchedulePostsJob>();
builder.Services.AddScoped<PublishNowJob>();
builder.Services.AddScoped<ProjectCleanupJob>();
builder.Services.AddScoped<AnalyticsJob>();
builder.Services.AddScoped<HealthCheckJob>();

// Register hosted service for recurring jobs
builder.Services.AddHostedService<RecurringJobService>();

var host = builder.Build();

// Initialize database
using (var scope = host.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Configure recurring jobs
using (var scope = host.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    
    // Schedule recurring jobs
    recurringJobManager.AddOrUpdate<PostPublishingJob>(
        "publish-scheduled-posts",
        job => job.PublishScheduledPosts(),
        "*/5 * * * *"); // Every 5 minutes
    
    recurringJobManager.AddOrUpdate<ProjectCleanupJob>(
        "cleanup-old-projects",
        job => job.CleanupOldProjects(),
        "0 2 * * *"); // Daily at 2 AM
}

await host.RunAsync();
