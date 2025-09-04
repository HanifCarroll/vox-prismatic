using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features;
using ContentCreation.Api.Features.Common;
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

builder.Services.AddControllers();

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

// Authentication services
builder.Services.AddScoped<ContentCreation.Api.Features.Auth.Services.IJwtService, ContentCreation.Api.Features.Auth.Services.JwtService>();
builder.Services.AddScoped<ContentCreation.Api.Features.Auth.Services.IPasswordService, ContentCreation.Api.Features.Auth.Services.PasswordService>();
builder.Services.AddScoped<ContentCreation.Api.Features.Auth.Services.ICurrentUserService, ContentCreation.Api.Features.Auth.Services.CurrentUserService>();


// Background job processors (migrated from Worker)
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.ProcessContentJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.InsightExtractionJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.PostGenerationJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.PostPublishingJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.SchedulePostsJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.PublishNowJob>();
builder.Services.AddScoped<ContentCreation.Api.Features.BackgroundJobs.ProjectCleanupJob>();

// Centralized background job service for queuing and recurring jobs
builder.Services.AddScoped<BackgroundJobService>();

// Server-Sent Events for real-time updates
builder.Services.AddServerSentEvents();

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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Content Creation API v1");
    });
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

// Setup recurring jobs using the centralized BackgroundJobService
using (var scope = app.Services.CreateScope())
{
    var backgroundJobService = scope.ServiceProvider.GetRequiredService<BackgroundJobService>();
    backgroundJobService.SetupRecurringJobs();
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