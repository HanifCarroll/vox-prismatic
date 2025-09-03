using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Hangfire;
using System.Text.Json;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class SchedulePostsJob
{
    private readonly ILogger<SchedulePostsJob> _logger;
    private readonly ApplicationDbContext _context;

    public SchedulePostsJob(
        ILogger<SchedulePostsJob> logger,
        ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }
    
    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task SchedulePost(Guid projectId, Guid postId, DateTime scheduledTime)
    {
        _logger.LogInformation("Scheduling post {PostId} for project {ProjectId} at {ScheduledTime}", 
            postId, projectId, scheduledTime);
        
        try
        {
            var project = await _context.ContentProjects
                .Include(p => p.Posts)
                .Include(p => p.ScheduledPosts)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            var post = project.Posts?.FirstOrDefault(p => p.Id == postId);
            if (post == null)
            {
                throw new Exception($"Post {postId} not found in project {projectId}");
            }
            
            // Create scheduled post entry
            var scheduledPost = ScheduledPost.Create(
                projectId: projectId,
                postId: postId,
                platform: post.Platform ?? SocialPlatform.LinkedIn,
                content: post.Content,
                scheduledFor: scheduledTime,
                timeZone: "UTC"
            );
            
            _context.ScheduledPosts.Add(scheduledPost);
            
            // Update post status using domain method
            post.MarkAsScheduled();
            
            // Update project stage if needed
            if (project.CurrentStage == ProjectStage.PostsApproved)
            {
                project.SchedulePosts();
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Successfully scheduled post {PostId} for {ScheduledTime}", postId, scheduledTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to schedule post {PostId} for project {ProjectId}", postId, projectId);
            throw;
        }
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task SchedulePosts(Guid projectId, Dictionary<Guid, DateTime> postSchedules)
    {
        _logger.LogInformation("Scheduling posts for project {ProjectId}", projectId);
        
        try
        {
            var project = await _context.ContentProjects
                .Include(p => p.Posts)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            var scheduledCount = 0;
            
            foreach (var (postId, scheduledTime) in postSchedules)
            {
                var post = project.Posts.FirstOrDefault(p => p.Id == postId);
                if (post == null)
                {
                    _logger.LogWarning("Post {PostId} not found in project {ProjectId}", postId, projectId);
                    continue;
                }
                
                var scheduledPost = ScheduledPost.Create(
                    projectId: projectId,
                    postId: postId,
                    platform: post.Platform ?? SocialPlatform.LinkedIn,
                    content: post.Content,
                    scheduledFor: scheduledTime,
                    timeZone: "UTC"
                );
                
                _context.ScheduledPosts.Add(scheduledPost);
                scheduledCount++;
                
                _logger.LogInformation("Scheduled post {PostId} for {ScheduledTime}", postId, scheduledTime);
            }
            
            project.TransitionTo(ProjectStage.Scheduled);
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Successfully scheduled {Count} posts for project {ProjectId}", 
                scheduledCount, projectId);
            
            await LogProjectEvent(projectId, "posts_scheduled", 
                $"Scheduled {scheduledCount} posts for publishing",
                new { ScheduledCount = scheduledCount, PostSchedules = postSchedules });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling posts for project {ProjectId}", projectId);
            throw;
        }
    }

    [Queue("default")]
    public async Task BulkSchedulePosts(Guid projectId, SocialPlatform platform, TimeSpan interval, DateTime startTime)
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
        
        var optimalTimes = GetOptimalPostingTimes(null);
        
        var approvedPosts = project.Posts
            .Where(p => p.Status == PostStatus.Approved)
            .OrderBy(p => p.CreatedAt)
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