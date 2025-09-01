using ContentCreation.Api.Features.Transcripts;
using ContentCreation.Api.Features.Transcripts.Interfaces;
using ContentCreation.Api.Features.Insights;
using ContentCreation.Api.Features.Insights.Interfaces;
using ContentCreation.Api.Features.Posts;
using ContentCreation.Api.Features.Posts.Interfaces;
using ContentCreation.Api.Features.Pipeline;
using ContentCreation.Api.Features.Pipeline.Interfaces;
using ContentCreation.Api.Features.Analytics;
using ContentCreation.Api.Features.Analytics.Interfaces;
using ContentCreation.Api.Features.Projects;
using ContentCreation.Api.Features.Projects.Interfaces;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Infrastructure.Auth;
using ContentCreation.Api.Infrastructure.AI;
using ContentCreation.Api.Infrastructure.Jobs;
using ContentCreation.Api.Infrastructure.Conventions;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.Redis.StackExchange;
using Lib.AspNetCore.ServerSentEvents;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Configuration.AddEnvironmentVariables();
if (File.Exists(".env"))
{
    DotNetEnv.Env.Load();
}

// Add services to the container.
builder.Services.AddControllers(options =>
{
    // Add a convention to prefix all controller routes with /api
    options.Conventions.Add(new ApiPrefixConvention());
});

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddFluentValidationClientsideAdapters();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddEndpointsApiExplorer();

// Swagger/OpenAPI configuration (similar to NestJS Swagger)
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v2", new OpenApiInfo
    {
        Title = "Content Creation API",
        Version = "v2",
        Description = "Intelligent content workflow automation system API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Database configuration (PostgreSQL with Entity Framework Core)
var connectionString = builder.Configuration["DATABASE_URL"] 
    ?? "Host=localhost;Database=content_creation;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Redis configuration
var redisHost = builder.Configuration["ConnectionStrings:Redis"]?.Split(':')[0] ?? builder.Configuration["REDIS_HOST"] ?? "localhost";
var redisPort = builder.Configuration["ConnectionStrings:Redis"]?.Split(':')[1] ?? builder.Configuration["REDIS_PORT"] ?? "6379";
var redisConnection = $"{redisHost}:{redisPort},abortConnect=false,connectTimeout=30000";

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect(redisConnection));

// Hangfire configuration (Alternative to BullMQ)
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseRedisStorage(ConnectionMultiplexer.Connect(redisConnection)));

builder.Services.AddHangfireServer();

// Server-Sent Events (SSE) configuration
builder.Services.AddServerSentEvents();

// CORS configuration
var allowedOrigins = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',') 
    ?? ["http://localhost:3000", "http://localhost:3001"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Configure JWT settings
    });

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Application services
builder.Services.AddScoped<IContentProjectService, ContentProjectService>();
builder.Services.AddScoped<ITranscriptService, TranscriptService>();
builder.Services.AddScoped<IInsightService, InsightService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IPipelineService, PipelineService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IOAuthService, OAuthService>();

// AI Services
builder.Services.AddSingleton<IGoogleAIService, GoogleAIService>();
builder.Services.AddSingleton<IDeepgramService, DeepgramService>();

// Background job services
builder.Services.AddScoped<IJobProcessingService, JobProcessingService>();

// Health checks
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString)
    .AddRedis($"{redisHost}:{redisPort},abortConnect=false");

var app = builder.Build();

// Middleware
app.UseHttpsRedirection();
app.UseCors("AllowSpecificOrigins");

// Configure Swagger and other development tools BEFORE path rewriting
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v2/swagger.json", "Content Creation API v2");
        c.RoutePrefix = "docs";
    });
    
    // Hangfire Dashboard
    app.UseHangfireDashboard("/hangfire");
}

app.UseAuthentication();
app.UseAuthorization();

// Map controller endpoints (will have /api prefix from convention)
app.MapControllers();

// Health check endpoint  
app.MapHealthChecks("/api/health");

// Server-Sent Events
app.MapServerSentEvents("/api/sse/events");

// Run database migrations on startup (similar to Prisma migrations)
// Note: In production, you might want to run migrations separately
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        // Check if database exists and can connect
        if (await dbContext.Database.CanConnectAsync())
        {
            logger.LogInformation("Database connection successful");
            
            // Apply pending migrations
            var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
            if (pendingMigrations.Any())
            {
                logger.LogInformation("Applying {Count} pending migration(s)...", pendingMigrations.Count());
                await dbContext.Database.MigrateAsync();
                logger.LogInformation("Database migrations applied successfully");
            }
            else
            {
                logger.LogInformation("Database is up to date");
            }
        }
        else
        {
            logger.LogWarning("Cannot connect to database. Creating database and applying migrations...");
            await dbContext.Database.MigrateAsync();
            logger.LogInformation("Database created and migrations applied");
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database");
        
        // In development, you might want to continue even if migrations fail
        if (!app.Environment.IsDevelopment())
        {
            throw;
        }
    }
}

app.Run();
