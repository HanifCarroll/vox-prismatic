using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Infrastructure.Services;
using ContentCreation.Api.Features;
using ContentCreation.Api.Features.Common;
using ContentCreation.Api.Infrastructure.Conventions;
using ContentCreation.Api.Infrastructure.Middleware;
using ContentCreation.Api.Infrastructure.Hubs;
using Lib.AspNetCore.ServerSentEvents;
using Hangfire;
using Hangfire.PostgreSql;
using System.Text;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog logging
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/api-.txt", rollingInterval: RollingInterval.Day);
});

builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new ApiPrefixConvention());
});

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Content Creation API", Version = "v1" });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHangfire(config =>
{
    config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(c =>
            c.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")));
});

// Configure Hangfire server to run in-process
builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = Environment.ProcessorCount * 2;
    options.Queues = new[] { "critical", "default", "low" };
});

// Register recurring job manager
builder.Services.AddSingleton<IRecurringJobManager, RecurringJobManager>();

builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

// MediatR for vertical slice architecture
builder.Services.AddMediatR(cfg => 
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
});

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

// Essential Infrastructure Services Only
// (Business logic is handled by MediatR handlers in vertical slices)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ILinkedInAuthService, LinkedInAuthService>();
builder.Services.AddHttpClient<IAIService, AIService>();
builder.Services.AddHttpClient<LinkedInService>();
builder.Services.AddScoped<IOAuthTokenStore, OAuthTokenStore>();

// Background job processors (migrated from Worker)
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.ProcessContentJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.InsightExtractionJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.PostGenerationJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.PostPublishingJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.SchedulePostsJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.PublishNowJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.ProjectCleanupJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.AnalyticsJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.HealthCheckJob>();

// Infrastructure services needed by handlers and background jobs
builder.Services.AddScoped<IDeepgramService, DeepgramService>();
builder.Services.AddScoped<ILinkedInService, LinkedInService>();

// Minimal implementations for migration phase
builder.Services.AddScoped<IBackgroundJobService, MinimalBackgroundJobService>();
builder.Services.AddScoped<ISocialPostPublisher, MinimalSocialPostPublisher>();

// Hosted service for recurring jobs
builder.Services.AddHostedService<ContentCreation.Api.Features.BackgroundJobs.RecurringJobService>();

// Real-time/SSE
builder.Services.AddServerSentEvents();
builder.Services.AddSingleton<ProjectProgressHub>();
builder.Services.AddSingleton<IProjectProgressHub>(sp => sp.GetRequiredService<ProjectProgressHub>());

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "your-256-bit-secret"))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()
            ?? new[] { "http://localhost:4200", "http://localhost:5173" };

        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("*");
    });
});

var app = builder.Build();

// Error handling and logging middleware (should be early)
app.UseErrorHandling();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Content Creation API v1");
    });

    // Request logging in development
    app.UseRequestLogging();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});

app.MapControllers();

// Map all feature endpoints using the extension method
app.MapFeatureEndpoints();

// Server-Sent Events endpoints (global and project-scoped)
app.MapServerSentEvents("/api/events");

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithTags("Health");

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Configure recurring jobs (migrated from Worker)
using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    
    // Schedule recurring jobs
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.PostPublishingJob>(
        "publish-scheduled-posts",
        job => job.PublishScheduledPosts(),
        configuration.GetValue<string>("Jobs:PublishingInterval", "*/5 * * * *")); // Every 5 minutes
    
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.PostPublishingJob>(
        "retry-failed-posts",
        job => job.RetryFailedPosts(),
        configuration.GetValue<string>("Jobs:RetryFailedInterval", "0 * * * *")); // Every hour
    
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.ProjectCleanupJob>(
        "cleanup-old-projects",
        job => job.CleanupOldProjects(),
        configuration.GetValue<string>("Jobs:CleanupInterval", "0 2 * * *")); // Daily at 2 AM
    
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.InsightExtractionJob>(
        "extract-insights",
        job => job.ExtractInsightsFromTranscripts(),
        configuration.GetValue<string>("Jobs:InsightExtractionInterval", "*/15 * * * *")); // Every 15 minutes
    
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.PostGenerationJob>(
        "generate-posts",
        job => job.GeneratePostsFromInsights(),
        configuration.GetValue<string>("Jobs:PostGenerationInterval", "*/20 * * * *")); // Every 20 minutes
    
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.AnalyticsJob>(
        "update-analytics",
        job => job.UpdateProjectAnalytics(),
        configuration.GetValue<string>("Jobs:AnalyticsInterval", "0 */6 * * *")); // Every 6 hours
    
    recurringJobManager.AddOrUpdate<ContentCreation.Api.Features.BackgroundJobs.HealthCheckJob>(
        "health-check",
        job => job.PerformHealthCheck(),
        configuration.GetValue<string>("Jobs:HealthCheckInterval", "*/30 * * * *")); // Every 30 minutes
}

app.Run();

public class HangfireAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context)
    {
        return true;
    }
}

// Removed inline stub services; concrete implementations are provided by Infrastructure.Services