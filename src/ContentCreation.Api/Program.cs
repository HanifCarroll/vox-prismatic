using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Infrastructure.Services;
using ContentCreation.Api.Infrastructure.Conventions;
using ContentCreation.Api.Infrastructure.Middleware;
using ContentCreation.Api.Infrastructure.Hubs;
using ContentCreation.Api.Hubs;
using Lib.AspNetCore.ServerSentEvents;
using Hangfire;
using Hangfire.PostgreSql;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

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
    config.UsePostgreSqlStorage(c =>
        c.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")));
});
builder.Services.AddHangfireServer();
builder.Services.AddSingleton<IRecurringJobManager, RecurringJobManager>();

builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

builder.Services.AddMemoryCache();

// SignalR for real-time updates
builder.Services.AddSignalR();

builder.Services.AddScoped<IContentProjectService, ContentProjectService>();
builder.Services.AddScoped<IProjectLifecycleService, ProjectLifecycleService>();
builder.Services.AddScoped<IContentProcessingService, ContentProcessingService>();
builder.Services.AddScoped<IPublishingService, PublishingService>();
builder.Services.AddHttpClient<IAIService, AIService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IInsightService, InsightService>();
builder.Services.AddScoped<IInsightStateService, InsightStateService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IPostStateService, PostStateService>();
builder.Services.AddScoped<ITranscriptService, TranscriptService>();
builder.Services.AddScoped<ITranscriptStateService, TranscriptStateService>();
builder.Services.AddScoped<IBackgroundJobService, BackgroundJobService>();
builder.Services.AddScoped<IQueueManagementService, QueueManagementService>();
builder.Services.AddScoped<IContentPipelineService, ContentPipelineService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IPromptService, PromptService>();
builder.Services.AddScoped<ISocialPostPublisher, SocialPostPublisher>();

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
        var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(',') 
            ?? new[] { "http://localhost:3000", "http://localhost:3001" };
        
        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("*"); // Allow SignalR headers
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

// Server-Sent Events endpoint
app.MapServerSentEvents("/api/sse/events");

// SignalR hubs
app.MapHub<PipelineHub>("/api/hubs/pipeline");
app.MapHub<NotificationHub>("/api/hubs/notifications");

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
}

app.Run();

public class HangfireAuthorizationFilter : Hangfire.Dashboard.IDashboardAuthorizationFilter
{
    public bool Authorize(Hangfire.Dashboard.DashboardContext context)
    {
        return true;
    }
}

public class ContentProcessingService : IContentProcessingService
{
    public async Task ProcessTranscriptAsync(string projectId, string jobId)
    {
        await Task.CompletedTask;
    }
    
    public async Task ExtractInsightsAsync(string projectId, string jobId)
    {
        await Task.CompletedTask;
    }
    
    public async Task GeneratePostsAsync(string projectId, string jobId, List<string> insightIds)
    {
        await Task.CompletedTask;
    }
}

public class SocialPostPublisher : ISocialPostPublisher
{
    public async Task PublishPostAsync(string projectId, string postId)
    {
        await Task.CompletedTask;
    }
    
    public async Task PublishToLinkedInAsync(string postId)
    {
        await Task.CompletedTask;
    }
    
    public async Task PublishToXAsync(string postId)
    {
        await Task.CompletedTask;
    }
}