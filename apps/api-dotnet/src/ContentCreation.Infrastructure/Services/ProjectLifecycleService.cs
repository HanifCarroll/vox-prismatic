using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using ContentCreation.Core.StateMachine;
using ContentCreation.Infrastructure.Data;
using Hangfire;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class ProjectLifecycleService : IProjectLifecycleService
{
    private readonly ApplicationDbContext _context;
    private readonly IBackgroundJobClient _backgroundJobs;
    private readonly ILogger<ProjectLifecycleService> _logger;
    
    public ProjectLifecycleService(
        ApplicationDbContext context,
        IBackgroundJobClient backgroundJobs,
        ILogger<ProjectLifecycleService> logger)
    {
        _context = context;
        _backgroundJobs = backgroundJobs;
        _logger = logger;
    }
    
    public async Task<ContentProject> TransitionStateAsync(string projectId, string trigger, string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        var stateMachine = new ProjectStateMachine(project.CurrentStage);
        
        if (!stateMachine.CanFire(trigger))
        {
            throw new InvalidOperationException(
                $"Cannot perform action '{trigger}' from current state '{project.CurrentStage}'");
        }
        
        var oldState = project.CurrentStage;
        await stateMachine.FireAsync(trigger);
        var newState = stateMachine.CurrentState;
        
        project.CurrentStage = newState;
        project.OverallProgress = stateMachine.GetProgressPercentage();
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        await RecordStateTransitionAsync(projectId, oldState, newState, trigger, userId);
        
        _logger.LogInformation(
            "Project {ProjectId} transitioned from {OldState} to {NewState} via {Trigger}",
            projectId, oldState, newState, trigger);
            
        return project;
    }
    
    public async Task<ContentProject> ProcessContentAsync(string projectId, string? userId = null)
    {
        var project = await ValidateProjectAndTransitionAsync(
            projectId, 
            Triggers.ProcessContent,
            userId);
            
        if (project.Transcript == null)
            throw new InvalidOperationException("Project has no transcript to process");
            
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = ProcessingJobType.CleanTranscript,
            Status = ProcessingJobStatus.Queued
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        var hangfireJobId = _backgroundJobs.Enqueue<IContentProcessingService>(
            service => service.ProcessTranscriptAsync(projectId, job.Id));
            
        job.HangfireJobId = hangfireJobId;
        await _context.SaveChangesAsync();
        
        await RecordProjectActivityAsync(
            projectId,
            "automation_triggered",
            "Content processing started",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> ExtractInsightsAsync(string projectId, string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        if (project.Transcript?.CleanedContent == null)
            throw new InvalidOperationException("Transcript must be processed before extracting insights");
            
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = ProcessingJobType.GenerateInsights,
            Status = ProcessingJobStatus.Queued
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        var hangfireJobId = _backgroundJobs.Enqueue<IContentProcessingService>(
            service => service.ExtractInsightsAsync(projectId, job.Id));
            
        job.HangfireJobId = hangfireJobId;
        await _context.SaveChangesAsync();
        
        await RecordProjectActivityAsync(
            projectId,
            "automation_triggered",
            "Insight extraction started",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> GeneratePostsAsync(
        string projectId, 
        List<string>? insightIds = null, 
        string? userId = null)
    {
        var project = await ValidateProjectAndTransitionAsync(
            projectId,
            Triggers.GeneratePosts,
            userId);
            
        var insights = insightIds != null
            ? project.Insights.Where(i => insightIds.Contains(i.Id) && i.Status == "approved").ToList()
            : project.Insights.Where(i => i.Status == "approved").ToList();
            
        if (!insights.Any())
            throw new InvalidOperationException("No approved insights available for post generation");
            
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = ProcessingJobType.GeneratePosts,
            Status = ProcessingJobStatus.Queued,
            Metadata = new { insightIds = insights.Select(i => i.Id).ToList() }
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        var hangfireJobId = _backgroundJobs.Enqueue<IContentProcessingService>(
            service => service.GeneratePostsAsync(projectId, job.Id, insights.Select(i => i.Id).ToList()));
            
        job.HangfireJobId = hangfireJobId;
        await _context.SaveChangesAsync();
        
        await RecordProjectActivityAsync(
            projectId,
            "automation_triggered",
            $"Post generation started for {insights.Count} insights",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> SchedulePostsAsync(
        string projectId,
        List<string>? postIds = null,
        string? userId = null)
    {
        var project = await ValidateProjectAndTransitionAsync(
            projectId,
            Triggers.SchedulePosts,
            userId);
            
        var posts = postIds != null
            ? project.Posts.Where(p => postIds.Contains(p.Id) && p.Status == "approved").ToList()
            : project.Posts.Where(p => p.Status == "approved").ToList();
            
        if (!posts.Any())
            throw new InvalidOperationException("No approved posts available for scheduling");
            
        foreach (var post in posts)
        {
            var scheduledPost = new ProjectScheduledPost
            {
                ProjectId = projectId,
                PostId = post.Id,
                Platform = post.Platform,
                Content = post.Content,
                ScheduledTime = CalculateOptimalScheduleTime(project.WorkflowConfig.PublishingSchedule),
                Status = "pending"
            };
            
            _context.ProjectScheduledPosts.Add(scheduledPost);
        }
        
        project.Metrics.PostsScheduled = posts.Count;
        await _context.SaveChangesAsync();
        
        await RecordProjectActivityAsync(
            projectId,
            "posts_scheduled",
            $"{posts.Count} posts scheduled for publishing",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> PublishNowAsync(
        string projectId,
        List<string> postIds,
        string? userId = null)
    {
        var project = await ValidateProjectAndTransitionAsync(
            projectId,
            Triggers.PublishNow,
            userId);
            
        foreach (var postId in postIds)
        {
            var hangfireJobId = _backgroundJobs.Enqueue<IPublishingService>(
                service => service.PublishPostAsync(projectId, postId));
        }
        
        await RecordProjectActivityAsync(
            projectId,
            "automation_triggered",
            $"Immediate publishing triggered for {postIds.Count} posts",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> ApproveInsightsAsync(
        string projectId,
        List<string> insightIds,
        string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        var insights = project.Insights.Where(i => insightIds.Contains(i.Id)).ToList();
        
        foreach (var insight in insights)
        {
            insight.Status = "approved";
            insight.ReviewedAt = DateTime.UtcNow;
            insight.ReviewedBy = userId;
        }
        
        project.Metrics.InsightsApproved = project.Insights.Count(i => i.Status == "approved");
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        if (project.Metrics.InsightsApproved > 0 && 
            project.CurrentStage == ProjectLifecycleStage.InsightsReady)
        {
            await TransitionStateAsync(projectId, Triggers.ApproveInsights, userId);
        }
        
        await RecordProjectActivityAsync(
            projectId,
            "insights_reviewed",
            $"{insights.Count} insights approved",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> RejectInsightsAsync(
        string projectId,
        List<string> insightIds,
        string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        var insights = project.Insights.Where(i => insightIds.Contains(i.Id)).ToList();
        
        foreach (var insight in insights)
        {
            insight.Status = "rejected";
            insight.ReviewedAt = DateTime.UtcNow;
            insight.ReviewedBy = userId;
        }
        
        project.Metrics.InsightsRejected = project.Insights.Count(i => i.Status == "rejected");
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        await RecordProjectActivityAsync(
            projectId,
            "insights_reviewed",
            $"{insights.Count} insights rejected",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> ApprovePostsAsync(
        string projectId,
        List<string> postIds,
        string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        var posts = project.Posts.Where(p => postIds.Contains(p.Id)).ToList();
        
        foreach (var post in posts)
        {
            post.Status = "approved";
            post.ReviewedAt = DateTime.UtcNow;
            post.ReviewedBy = userId;
        }
        
        project.Metrics.PostsApproved = project.Posts.Count(p => p.Status == "approved");
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        if (project.Metrics.PostsApproved > 0 && 
            project.CurrentStage == ProjectLifecycleStage.PostsGenerated)
        {
            await TransitionStateAsync(projectId, Triggers.ApprovePosts, userId);
        }
        
        await RecordProjectActivityAsync(
            projectId,
            "posts_reviewed",
            $"{posts.Count} posts approved",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> RejectPostsAsync(
        string projectId,
        List<string> postIds,
        string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        var posts = project.Posts.Where(p => postIds.Contains(p.Id)).ToList();
        
        foreach (var post in posts)
        {
            post.Status = "rejected";
            post.ReviewedAt = DateTime.UtcNow;
            post.ReviewedBy = userId;
        }
        
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        await RecordProjectActivityAsync(
            projectId,
            "posts_reviewed",
            $"{posts.Count} posts rejected",
            userId);
            
        return project;
    }
    
    public async Task<ContentProject> ArchiveProjectAsync(string projectId, string? userId = null)
    {
        return await TransitionStateAsync(projectId, Triggers.Archive, userId);
    }
    
    public async Task<ContentProject> RestoreProjectAsync(string projectId, string? userId = null)
    {
        return await TransitionStateAsync(projectId, Triggers.Restore, userId);
    }
    
    public async Task<bool> CanTransitionAsync(string projectId, string trigger)
    {
        var project = await _context.ContentProjects.FindAsync(projectId);
        
        if (project == null)
            return false;
            
        var stateMachine = new ProjectStateMachine(project.CurrentStage);
        return stateMachine.CanFire(trigger);
    }
    
    public async Task<List<string>> GetAvailableActionsAsync(string projectId)
    {
        var project = await _context.ContentProjects.FindAsync(projectId);
        
        if (project == null)
            return new List<string>();
            
        var stateMachine = new ProjectStateMachine(project.CurrentStage);
        return stateMachine.GetPermittedTriggers().ToList();
    }
    
    public async Task<int> CalculateProjectProgressAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            return 0;
            
        var stateMachine = new ProjectStateMachine(project.CurrentStage);
        var baseProgress = stateMachine.GetProgressPercentage();
        
        if (project.CurrentStage == ProjectLifecycleStage.InsightsReady && project.Insights.Any())
        {
            var approvedRatio = (float)project.Insights.Count(i => i.Status == "approved") / project.Insights.Count;
            baseProgress += (int)(approvedRatio * 15);
        }
        else if (project.CurrentStage == ProjectLifecycleStage.PostsGenerated && project.Posts.Any())
        {
            var approvedRatio = (float)project.Posts.Count(p => p.Status == "approved") / project.Posts.Count;
            baseProgress += (int)(approvedRatio * 15);
        }
        
        return Math.Min(100, baseProgress);
    }
    
    public async Task UpdateProjectMetricsAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        project.Metrics.TranscriptWordCount = project.Transcript?.WordCount ?? 0;
        project.Metrics.InsightsTotal = project.Insights.Count;
        project.Metrics.InsightsApproved = project.Insights.Count(i => i.Status == "approved");
        project.Metrics.InsightsRejected = project.Insights.Count(i => i.Status == "rejected");
        project.Metrics.PostsTotal = project.Posts.Count;
        project.Metrics.PostsApproved = project.Posts.Count(p => p.Status == "approved");
        project.Metrics.PostsScheduled = project.ScheduledPosts.Count(p => p.Status == "pending");
        project.Metrics.PostsPublished = project.ScheduledPosts.Count(p => p.Status == "published");
        project.Metrics.PostsFailed = project.ScheduledPosts.Count(p => p.Status == "failed");
        
        project.OverallProgress = await CalculateProjectProgressAsync(projectId);
        
        await _context.SaveChangesAsync();
    }
    
    public async Task RecordStateTransitionAsync(
        string projectId,
        string fromState,
        string toState,
        string trigger,
        string? userId = null)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = "stage_changed",
            ActivityName = $"State Transition: {trigger}",
            Description = $"Project transitioned from {fromState} to {toState}",
            UserId = userId,
            Metadata = JsonSerializer.Serialize(new
            {
                fromState,
                toState,
                trigger,
                timestamp = DateTime.UtcNow
            }),
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
    
    private async Task<ContentProject> ValidateProjectAndTransitionAsync(
        string projectId,
        string trigger,
        string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");
            
        var stateMachine = new ProjectStateMachine(project.CurrentStage);
        
        if (!stateMachine.CanFire(trigger))
        {
            throw new InvalidOperationException(
                $"Cannot perform action '{trigger}' from current state '{project.CurrentStage}'");
        }
        
        var oldState = project.CurrentStage;
        await stateMachine.FireAsync(trigger);
        
        project.CurrentStage = stateMachine.CurrentState;
        project.OverallProgress = stateMachine.GetProgressPercentage();
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        await RecordStateTransitionAsync(projectId, oldState, project.CurrentStage, trigger, userId);
        
        return project;
    }
    
    private async Task RecordProjectActivityAsync(
        string projectId,
        string activityType,
        string activityName,
        string? userId = null)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = activityType,
            ActivityName = activityName,
            Description = activityName,
            UserId = userId,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
    
    private DateTime CalculateOptimalScheduleTime(PublishingSchedule schedule)
    {
        var now = DateTime.UtcNow;
        var targetTime = now.Date.Add(schedule.PreferredTime.ToTimeSpan());
        
        while (!schedule.PreferredDays.Contains(targetTime.DayOfWeek))
        {
            targetTime = targetTime.AddDays(1);
        }
        
        if (targetTime <= now)
        {
            targetTime = targetTime.AddDays(7);
            while (!schedule.PreferredDays.Contains(targetTime.DayOfWeek))
            {
                targetTime = targetTime.AddDays(1);
            }
        }
        
        return targetTime;
    }
}