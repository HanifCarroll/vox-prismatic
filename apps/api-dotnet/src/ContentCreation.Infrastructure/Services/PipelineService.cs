using ContentCreation.Core.DTOs;
using ContentCreation.Core.DTOs.Notifications;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Infrastructure.Services;

public class PipelineService : IPipelineService
{
    private readonly ILogger<PipelineService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    
    private readonly Dictionary<string, List<string>> _stageTransitions = new()
    {
        ["raw_content"] = new() { "processing_content" },
        ["processing_content"] = new() { "insights_ready", "failed" },
        ["insights_ready"] = new() { "insights_approved", "processing_content" },
        ["insights_approved"] = new() { "posts_generated" },
        ["posts_generated"] = new() { "posts_approved", "insights_approved" },
        ["posts_approved"] = new() { "scheduled" },
        ["scheduled"] = new() { "publishing", "posts_approved" },
        ["publishing"] = new() { "published", "scheduled", "failed" },
        ["published"] = new() { "archived" },
        ["failed"] = new() { "raw_content", "processing_content" },
        ["archived"] = new()
    };

    public PipelineService(
        ILogger<PipelineService> logger,
        ApplicationDbContext context,
        INotificationService notificationService)
    {
        _logger = logger;
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<bool> TransitionToStageAsync(string projectId, string targetStage, string? userId = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            _logger.LogWarning("Project {ProjectId} not found for stage transition", projectId);
            return false;
        }

        // Validate the transition
        if (!await ValidateStageTransitionAsync(projectId, targetStage))
        {
            _logger.LogWarning("Invalid stage transition from {CurrentStage} to {TargetStage} for project {ProjectId}",
                project.CurrentStage, targetStage, projectId);
            return false;
        }

        var previousStage = project.CurrentStage;
        project.CurrentStage = targetStage;
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;

        // Update progress based on stage
        project.OverallProgress = CalculateProgressForStage(targetStage);

        // Record the activity
        var activity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = "stage_transition",
            ActivityName = $"Stage Transition: {previousStage} → {targetStage}",
            Description = $"Project transitioned from {previousStage} to {targetStage}",
            UserId = userId,
            OccurredAt = DateTime.UtcNow
        };

        _context.ProjectActivities.Add(activity);
        await _context.SaveChangesAsync();

        // Send notification
        await _notificationService.CreateAsync(new CreateNotificationDto
        {
            UserId = project.CreatedBy.ToString(),
            Type = NotificationType.PipelineUpdate,
            Priority = NotificationPriority.Normal,
            Title = "Pipeline Stage Changed",
            Message = $"Project '{project.Title}' moved to {targetStage}",
            ProjectId = Guid.Parse(projectId)
        });

        _logger.LogInformation("Project {ProjectId} transitioned from {PreviousStage} to {TargetStage}",
            projectId, previousStage, targetStage);

        return true;
    }

    public async Task<bool> ValidateStageTransitionAsync(string projectId, string targetStage)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
            return false;

        // Check if transition is allowed
        if (!_stageTransitions.ContainsKey(project.CurrentStage))
            return false;

        if (!_stageTransitions[project.CurrentStage].Contains(targetStage))
            return false;

        // Additional validation based on stage requirements
        return targetStage switch
        {
            "insights_approved" => project.Insights.Any(i => i.IsApproved),
            "posts_generated" => project.Insights.Any(i => i.IsApproved),
            "posts_approved" => project.Posts.Any(p => p.IsApproved),
            "scheduled" => project.ScheduledPosts.Any(),
            "published" => project.ScheduledPosts.Any(sp => sp.Status == "published"),
            _ => true
        };
    }

    public async Task UpdateProgressAsync(string projectId, int progress, string? message = null)
    {
        var project = await _context.ContentProjects
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            _logger.LogWarning("Project {ProjectId} not found for progress update", projectId);
            return;
        }

        project.OverallProgress = Math.Min(100, Math.Max(0, progress));
        project.UpdatedAt = DateTime.UtcNow;
        project.LastActivityAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(message))
        {
            var activity = new ProjectActivity
            {
                ProjectId = projectId,
                ActivityType = "progress_update",
                ActivityName = "Progress Update",
                Description = message,
                Metadata = $"{{\"progress\": {progress}}}",
                OccurredAt = DateTime.UtcNow
            };

            _context.ProjectActivities.Add(activity);
        }

        await _context.SaveChangesAsync();

        _logger.LogDebug("Updated progress for project {ProjectId} to {Progress}%", projectId, progress);
    }

    public async Task<PipelineStatusDto> GetPipelineStatusAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Activities.OrderByDescending(a => a.OccurredAt).Take(1))
            .Include(p => p.ProcessingJobs)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            throw new InvalidOperationException($"Project {projectId} not found");
        }

        var allowedTransitions = await GetAllowedTransitionsAsync(projectId);
        var stageStatuses = await GetStageStatusesAsync(projectId);

        return new PipelineStatusDto
        {
            ProjectId = projectId,
            CurrentStage = project.CurrentStage,
            OverallProgress = project.OverallProgress,
            CurrentActivity = project.Activities.FirstOrDefault()?.Description,
            LastActivityAt = project.LastActivityAt,
            AllowedTransitions = allowedTransitions,
            StageStatuses = stageStatuses
        };
    }

    public async Task RecordStageActivityAsync(string projectId, string stage, string activityType, string? description = null, string? userId = null)
    {
        var activity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = activityType,
            ActivityName = $"{stage}: {activityType}",
            Description = description,
            UserId = userId,
            Metadata = $"{{\"stage\": \"{stage}\"}}",
            OccurredAt = DateTime.UtcNow
        };

        _context.ProjectActivities.Add(activity);
        
        // Update project's last activity timestamp
        var project = await _context.ContentProjects.FindAsync(projectId);
        if (project != null)
        {
            project.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Recorded activity for project {ProjectId} in stage {Stage}: {ActivityType}",
            projectId, stage, activityType);
    }

    public async Task<List<string>> GetAllowedTransitionsAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null || !_stageTransitions.ContainsKey(project.CurrentStage))
            return new List<string>();

        var allowedTransitions = new List<string>();
        
        foreach (var targetStage in _stageTransitions[project.CurrentStage])
        {
            if (await ValidateStageTransitionAsync(projectId, targetStage))
            {
                allowedTransitions.Add(targetStage);
            }
        }

        return allowedTransitions;
    }

    public async Task<bool> IsStageCompleteAsync(string projectId, string stage)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
            return false;

        return stage switch
        {
            "raw_content" => project.Transcript != null,
            "processing_content" => project.Transcript?.Status == "processed",
            "insights_ready" => project.Insights.Any(),
            "insights_approved" => project.Insights.Any(i => i.IsApproved),
            "posts_generated" => project.Posts.Any(),
            "posts_approved" => project.Posts.Any(p => p.IsApproved),
            "scheduled" => project.ScheduledPosts.Any(sp => sp.Status == "scheduled"),
            "published" => project.ScheduledPosts.Any(sp => sp.Status == "published"),
            _ => false
        };
    }

    private int CalculateProgressForStage(string stage)
    {
        return stage switch
        {
            "raw_content" => 10,
            "processing_content" => 20,
            "insights_ready" => 35,
            "insights_approved" => 50,
            "posts_generated" => 65,
            "posts_approved" => 80,
            "scheduled" => 90,
            "publishing" => 95,
            "published" => 100,
            "failed" => 0,
            "archived" => 100,
            _ => 0
        };
    }

    private async Task<Dictionary<string, StageStatus>> GetStageStatusesAsync(string projectId)
    {
        var activities = await _context.ProjectActivities
            .Where(a => a.ProjectId == projectId && a.ActivityType == "stage_transition")
            .OrderBy(a => a.OccurredAt)
            .ToListAsync();

        var project = await _context.ContentProjects.FindAsync(projectId);
        
        var statuses = new Dictionary<string, StageStatus>();
        var allStages = new[] { "raw_content", "processing_content", "insights_ready", 
            "insights_approved", "posts_generated", "posts_approved", "scheduled", 
            "publishing", "published", "archived" };

        foreach (var stage in allStages)
        {
            var stageActivities = activities
                .Where(a => a.ActivityName?.Contains($"→ {stage}") == true)
                .ToList();

            var isComplete = await IsStageCompleteAsync(projectId, stage);
            var isActive = project?.CurrentStage == stage;

            statuses[stage] = new StageStatus
            {
                IsComplete = isComplete,
                IsActive = isActive,
                StartedAt = stageActivities.FirstOrDefault()?.OccurredAt,
                CompletedAt = isComplete ? stageActivities.LastOrDefault()?.OccurredAt : null
            };
        }

        return statuses;
    }
}