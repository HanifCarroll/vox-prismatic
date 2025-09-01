using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Infrastructure.Services;
using ContentCreation.Api.Infrastructure.Conventions;
using ContentCreation.Api.Infrastructure.Middleware;
using ContentCreation.Api.Infrastructure.Hubs;
using Lib.AspNetCore.ServerSentEvents;
using Hangfire;
using Hangfire.Redis.StackExchange;
using StackExchange.Redis;
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

var redisConnection = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
var redis = ConnectionMultiplexer.Connect(redisConnection);
builder.Services.AddSingleton<IConnectionMultiplexer>(redis);

builder.Services.AddHangfire(config =>
{
    config.UseRedisStorage(redis);
});
builder.Services.AddHangfireServer();

builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

builder.Services.AddMemoryCache();

builder.Services.AddScoped<IContentProjectService, ContentProjectService>();
builder.Services.AddScoped<IProjectLifecycleService, ProjectLifecycleService>();
builder.Services.AddScoped<IContentProcessingService, ContentProcessingService>();
builder.Services.AddScoped<IPublishingService, PublishingService>();
builder.Services.AddScoped<IAIService, AiService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IInsightService, InsightService>();
builder.Services.AddScoped<IInsightStateService, InsightStateService>();

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
            .AllowCredentials();
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

public class PublishingService : IPublishingService
{
    public async Task PublishPostAsync(string projectId, string postId)
    {
        await Task.CompletedTask;
    }
}