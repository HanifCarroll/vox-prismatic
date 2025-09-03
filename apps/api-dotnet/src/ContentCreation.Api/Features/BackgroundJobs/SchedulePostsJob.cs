using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Hangfire;
using System.Text.Json;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class SchedulePostsJob
{
    private readonly ILogger<SchedulePostsJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IContentProjectService _projectService;

    public SchedulePostsJob(
        ILogger<SchedulePostsJob> logger,
        ApplicationDbContext context,
        IContentProjectService projectService)
    {
        _logger = logger;
        _context = context;
        _projectService = projectService;
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task SchedulePosts(Guid projectId, Dictionary<Guid, DateTime> postSchedules)
    {
        _logger.LogInformation("Scheduling posts for project {ProjectId}", projectId);
        
        var job = await CreateProcessingJob(projectId, ProcessingJobType.SchedulePosts);
        
        try
        {
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 10);
            
            var project = await _context.ContentProjects
                .Include(p => p.Posts)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            var scheduledCount = 0;
            var totalPosts = postSchedules.Count;
            
            foreach (var (postId, scheduledTime) in postSchedules)
            {
                var post = project.Posts.FirstOrDefault(p => p.Id == postId);
                if (post == null)
                {
                    _logger.LogWarning("Post {PostId} not found in project {ProjectId}", postId, projectId);
                    continue;
                }
                
                var scheduledPost = new ProjectScheduledPost
                {
                    ProjectId = projectId,
                    PostId = postId,
                    Platform = post.Platform ?? "linkedin",
                    Content = post.Content,
                    ScheduledTime = scheduledTime,
                    Status = ScheduledPostStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _context.ProjectScheduledPosts.Add(scheduledPost);
                scheduledCount++;
                
                var progress = 10 + (int)((float)scheduledCount / totalPosts * 80);
                await UpdateJobStatus(job, ProcessingJobStatus.Processing, progress);
                
                _logger.LogInformation("Scheduled post {PostId} for {ScheduledTime}", postId, scheduledTime);
                
                if (scheduledTime <= DateTime.UtcNow.AddMinutes(5))
                {
                    BackgroundJob.Schedule<PostPublishingJob>(
                        j => j.PublishPost(scheduledPost),
                        scheduledTime - DateTime.UtcNow);
                }
            }
            
            project.TransitionTo(ProjectStage.Scheduled);
            
            await _context.SaveChangesAsync();
            
            await CompleteJob(job, scheduledCount);
            
            _logger.LogInformation("Successfully scheduled {Count} posts for project {ProjectId}", 
                scheduledCount, projectId);
            
            await LogProjectEvent(projectId, "posts_scheduled", 
                $"Scheduled {scheduledCount} posts for publishing",
                new { ScheduledCount = scheduledCount, PostSchedules = postSchedules });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling posts for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    [Queue("default")]
    public async Task BulkSchedulePosts(Guid projectId, string platform, TimeSpan interval, DateTime startTime)
    {
        _logger.LogInformation("Bulk scheduling posts for project {ProjectId} on {Platform}", projectId, platform);
        
        var posts = await _context.Posts
            .Where(p => p.ProjectId == projectId)
            .Where(p => p.Platform == platform || p.Platform == null)
            .Where(p => p.Status == PostStatus.Approved)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
        
        if (!posts.Any())
        {
            _logger.LogWarning("No approved posts found for bulk scheduling");
            return;
        }
        
        var scheduleTime = startTime;
        var postSchedules = new Dictionary<Guid, DateTime>();
        
        foreach (var post in posts)
        {
            postSchedules[post.Id] = scheduleTime;
            scheduleTime = scheduleTime.Add(interval);
        }
        
        await SchedulePosts(projectId, postSchedules);
    }

    [Queue("default")]
    public async Task OptimizeScheduleTiming(Guid projectId)
    {
        _logger.LogInformation("Optimizing schedule timing for project {ProjectId}", projectId);
        
        var project = await _context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        
        if (project == null)
        {
            _logger.LogWarning("Project {ProjectId} not found", projectId);
            return;
        }
        
        var optimalTimes = GetOptimalPostingTimes(project.WorkflowConfig?.PreferredPostingTimes);
        
        var approvedPosts = project.Posts
            .Where(p => p.Status == PostStatus.Approved)
            .OrderBy(p => p.Priority)
            .ThenBy(p => p.CreatedAt)
            .ToList();
        
        if (!approvedPosts.Any())
        {
            _logger.LogInformation("No approved posts to schedule");
            return;
        }
        
        var postSchedules = new Dictionary<Guid, DateTime>();
        var timeIndex = 0;
        
        foreach (var post in approvedPosts)
        {
            if (timeIndex >= optimalTimes.Count)
            {
                timeIndex = 0;
            }
            
            postSchedules[post.Id] = optimalTimes[timeIndex];
            timeIndex++;
        }
        
        await SchedulePosts(projectId, postSchedules);
        
        _logger.LogInformation("Optimized scheduling for {Count} posts", postSchedules.Count);
    }

    private List<DateTime> GetOptimalPostingTimes(List<string>? preferredTimes)
    {
        var times = new List<DateTime>();
        var baseDate = DateTime.UtcNow.Date.AddDays(1);
        
        if (preferredTimes != null && preferredTimes.Any())
        {
            foreach (var slot in preferredTimes)
            {
                if (TimeSpan.TryParse(slot, out var time))
                {
                    times.Add(baseDate.Add(time));
                }
            }
        }
        
        if (!times.Any())
        {
            times.Add(baseDate.AddHours(9));
            times.Add(baseDate.AddHours(12));
            times.Add(baseDate.AddHours(15));
            times.Add(baseDate.AddHours(18));
        }
        
        return times.OrderBy(t => t).ToList();
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(Guid projectId, ProcessingJobType jobType)
    {
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = jobType,
            Status = ProcessingJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        return job;
    }

    private async Task UpdateJobStatus(ProjectProcessingJob job, ProcessingJobStatus status, int progress)
    {
        job.Status = status;
        job.Progress = progress;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (status == ProcessingJobStatus.Processing && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CompleteJob(ProjectProcessingJob job, int resultCount)
    {
        job.Status = ProcessingJobStatus.Completed;
        job.Progress = 100;
        job.ResultCount = resultCount;
        job.CompletedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (job.StartedAt.HasValue)
        {
            job.DurationMs = (int)(job.CompletedAt.Value - job.StartedAt.Value).TotalMilliseconds;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task FailJob(ProjectProcessingJob job, string errorMessage)
    {
        job.Status = ProcessingJobStatus.Failed;
        job.ErrorMessage = errorMessage;
        job.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
    }

    private async Task LogProjectEvent(Guid projectId, string eventType, string description, object? metadata = null)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = eventType,
            ActivityName = description,
            Description = description,
            Metadata = metadata != null ? JsonSerializer.Serialize(metadata) : null,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
}