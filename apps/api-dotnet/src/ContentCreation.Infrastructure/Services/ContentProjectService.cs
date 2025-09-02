using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.DTOs;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using ContentCreation.Core.StateMachine;
using System.Text.Json;
using ContentCreation.Infrastructure.Data;
using AutoMapper;
using Hangfire;

namespace ContentCreation.Infrastructure.Services;

public class ContentProjectService : IContentProjectService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IBackgroundJobClient _backgroundJobs;
    private readonly IProjectLifecycleService _lifecycleService;

    public ContentProjectService(
        ApplicationDbContext context,
        IMapper mapper,
        IBackgroundJobClient backgroundJobs,
        IProjectLifecycleService lifecycleService)
    {
        _context = context;
        _mapper = mapper;
        _backgroundJobs = backgroundJobs;
        _lifecycleService = lifecycleService;
    }

    public async Task<ContentProjectDto> CreateProjectAsync(CreateProjectDto dto, string userId)
    {
        var project = new ContentProject
        {
            Title = dto.Title,
            Description = dto.Description,
            Tags = dto.Tags,
            SourceType = dto.SourceType,
            SourceUrl = dto.SourceUrl,
            FileName = dto.FileName,
            CreatedBy = userId,
            CurrentStage = ProjectLifecycleStage.RawContent,
            WorkflowConfig = dto.WorkflowConfig != null ? _mapper.Map<WorkflowConfiguration>(dto.WorkflowConfig) : new WorkflowConfiguration()
        };

        if (!string.IsNullOrEmpty(dto.TranscriptContent))
        {
            var transcript = new Transcript
            {
                ProjectId = project.Id,
                Title = dto.Title,
                RawContent = dto.TranscriptContent,
                Status = "raw",
                SourceType = dto.SourceType,
                SourceUrl = dto.SourceUrl,
                FileName = dto.FileName,
                WordCount = dto.TranscriptContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length
            };
            
            project.TranscriptId = transcript.Id;
            project.Transcript = transcript;
            project.Metrics.TranscriptWordCount = transcript.WordCount;
            
            _context.Transcripts.Add(transcript);
        }

        _context.ContentProjects.Add(project);
        await _context.SaveChangesAsync();

        await RecordProjectActivityAsync(
            project.Id, 
            "transcript_uploaded", 
            "Project Created",
            JsonSerializer.Serialize(new { source = dto.SourceType }),
            userId);

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDetailDto> GetProjectByIdAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.ScheduledPosts)
            .Include(p => p.Activities.OrderByDescending(a => a.OccurredAt).Take(10))
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        return _mapper.Map<ContentProjectDetailDto>(project);
    }

    public async Task<ContentProjectDto> UpdateProjectAsync(string projectId, UpdateProjectDto dto)
    {
        var project = await _context.ContentProjects.FindAsync(projectId);
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        if (!string.IsNullOrEmpty(dto.Title))
            project.Title = dto.Title;
        
        if (dto.Description != null)
            project.Description = dto.Description;
        
        if (dto.Tags != null)
            project.Tags = dto.Tags;
        
        if (dto.WorkflowConfig != null)
            project.WorkflowConfig = _mapper.Map<WorkflowConfiguration>(dto.WorkflowConfig);

        await _context.SaveChangesAsync();
        
        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<(List<ContentProjectDto> Items, int TotalCount)> GetProjectsAsync(ProjectFilterDto filter)
    {
        var query = _context.ContentProjects
            .Include(p => p.Transcript)
            .AsQueryable();

        if (!string.IsNullOrEmpty(filter.Stage))
            query = query.Where(p => p.CurrentStage == filter.Stage);

        if (filter.Tags != null && filter.Tags.Any())
            query = query.Where(p => p.Tags.Any(t => filter.Tags.Contains(t)));

        if (!string.IsNullOrEmpty(filter.SearchTerm))
            query = query.Where(p => 
                p.Title.Contains(filter.SearchTerm) || 
                (p.Description != null && p.Description.Contains(filter.SearchTerm)));

        if (filter.CreatedAfter.HasValue)
            query = query.Where(p => p.CreatedAt >= filter.CreatedAfter.Value);

        if (filter.CreatedBefore.HasValue)
            query = query.Where(p => p.CreatedAt <= filter.CreatedBefore.Value);

        if (!string.IsNullOrEmpty(filter.CreatedBy))
            query = query.Where(p => p.CreatedBy == filter.CreatedBy);

        if (filter.HasScheduledPosts.HasValue)
            query = query.Where(p => filter.HasScheduledPosts.Value 
                ? p.Metrics.PostsScheduled > 0 
                : p.Metrics.PostsScheduled == 0);

        if (filter.HasPublishedPosts.HasValue)
            query = query.Where(p => filter.HasPublishedPosts.Value 
                ? p.Metrics.PostsPublished > 0 
                : p.Metrics.PostsPublished == 0);

        var totalCount = await query.CountAsync();

        query = filter.SortBy.ToLower() switch
        {
            "title" => filter.SortDescending ? query.OrderByDescending(p => p.Title) : query.OrderBy(p => p.Title),
            "updatedat" => filter.SortDescending ? query.OrderByDescending(p => p.UpdatedAt) : query.OrderBy(p => p.UpdatedAt),
            "stage" => filter.SortDescending ? query.OrderByDescending(p => p.CurrentStage) : query.OrderBy(p => p.CurrentStage),
            _ => filter.SortDescending ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt)
        };

        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => _mapper.Map<ContentProjectDto>(p))
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task DeleteProjectAsync(string projectId)
    {
        var project = await _context.ContentProjects.FindAsync(projectId);
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        _context.ContentProjects.Remove(project);
        await _context.SaveChangesAsync();
    }

    public async Task<ContentProjectDto> ChangeProjectStageAsync(string projectId, string newStage)
    {
        var project = await _context.ContentProjects.FindAsync(projectId);
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        var stateMachine = new ProjectStateMachine(project.CurrentStage);
        var trigger = DetermineTransitionTrigger(project.CurrentStage, newStage);
        
        if (trigger == null || !stateMachine.CanFire(trigger))
            throw new InvalidOperationException($"Cannot transition from {project.CurrentStage} to {newStage}");

        var oldStage = project.CurrentStage;
        await stateMachine.FireAsync(trigger);
        
        project.CurrentStage = stateMachine.CurrentState;
        project.OverallProgress = stateMachine.GetProgressPercentage();

        await _context.SaveChangesAsync();

        await RecordProjectActivityAsync(
            projectId,
            "stage_changed",
            $"Stage changed from {oldStage} to {newStage}",
            JsonSerializer.Serialize(new { oldStage, newStage }));

        return _mapper.Map<ContentProjectDto>(project);
    }
    
    private string? DetermineTransitionTrigger(string currentStage, string targetStage)
    {
        if (targetStage == ProjectLifecycleStage.Archived)
            return Triggers.Archive;
            
        return (currentStage, targetStage) switch
        {
            (ProjectLifecycleStage.RawContent, ProjectLifecycleStage.ProcessingContent) => Triggers.ProcessContent,
            (ProjectLifecycleStage.ProcessingContent, ProjectLifecycleStage.InsightsReady) => Triggers.CompleteProcessing,
            (ProjectLifecycleStage.InsightsReady, ProjectLifecycleStage.InsightsApproved) => Triggers.ApproveInsights,
            (ProjectLifecycleStage.InsightsApproved, ProjectLifecycleStage.PostsGenerated) => Triggers.GeneratePosts,
            (ProjectLifecycleStage.PostsGenerated, ProjectLifecycleStage.PostsApproved) => Triggers.ApprovePosts,
            (ProjectLifecycleStage.PostsApproved, ProjectLifecycleStage.Scheduled) => Triggers.SchedulePosts,
            (ProjectLifecycleStage.PostsApproved, ProjectLifecycleStage.Publishing) => Triggers.PublishNow,
            (ProjectLifecycleStage.Scheduled, ProjectLifecycleStage.Publishing) => Triggers.StartPublishing,
            (ProjectLifecycleStage.Publishing, ProjectLifecycleStage.Published) => Triggers.CompletePublishing,
            (ProjectLifecycleStage.Archived, ProjectLifecycleStage.RawContent) => Triggers.Restore,
            _ => null
        };
    }

    public async Task<ContentProjectDto> ProcessContentAsync(string projectId, ProcessContentDto dto)
    {
        var userId = "system";
        var project = await _lifecycleService.ProcessContentAsync(projectId, userId);
        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> ExtractInsightsAsync(string projectId)
    {
        var userId = "system";
        var project = await _lifecycleService.ExtractInsightsAsync(projectId, userId);
        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> GeneratePostsAsync(string projectId, List<string>? insightIds = null)
    {
        var userId = "system";
        var project = await _lifecycleService.GeneratePostsAsync(projectId, insightIds, userId);
        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> SchedulePostsAsync(string projectId, List<string>? postIds = null)
    {
        var userId = "system";
        var project = await _lifecycleService.SchedulePostsAsync(projectId, postIds, userId);
        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> PublishNowAsync(string projectId, List<string> postIds)
    {
        var userId = "system";
        var project = await _lifecycleService.PublishNowAsync(projectId, postIds, userId);
        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ProjectMetricsDto> UpdateProjectMetricsAsync(string projectId)
    {
        await _lifecycleService.UpdateProjectMetricsAsync(projectId);
        
        var project = await _context.ContentProjects
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        return _mapper.Map<ProjectMetricsDto>(project.Metrics);
    }

    public async Task RecordProjectActivityAsync(string projectId, string activityType, string? activityName, string? metadata = null, string? userId = null)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = activityType,
            ActivityName = activityName,
            Description = activityName,
            UserId = userId,
            Metadata = metadata,
            OccurredAt = DateTime.UtcNow
        };

        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ProjectActivityDto>> GetProjectActivitiesAsync(string projectId, int limit = 20)
    {
        var activities = await _context.ProjectActivities
            .Where(a => a.ProjectId == projectId)
            .OrderByDescending(a => a.OccurredAt)
            .Take(limit)
            .ToListAsync();

        return _mapper.Map<List<ProjectActivityDto>>(activities);
    }

    public async Task<Dictionary<string, int>> GetProjectCountsByStageAsync(string? userId = null)
    {
        var query = _context.ContentProjects.AsQueryable();
        
        if (!string.IsNullOrEmpty(userId))
            query = query.Where(p => p.CreatedBy == userId);

        var counts = await query
            .GroupBy(p => p.CurrentStage)
            .Select(g => new { Stage = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Stage, x => x.Count);

        foreach (var stage in ProjectLifecycleStage.AllStages)
        {
            if (!counts.ContainsKey(stage))
                counts[stage] = 0;
        }

        return counts;
    }

    public async Task<List<ContentProjectDto>> GetActionableProjectsAsync(string? userId = null)
    {
        var query = _context.ContentProjects
            .Include(p => p.Transcript)
            .Where(p => 
                p.CurrentStage == ProjectLifecycleStage.InsightsReady ||
                p.CurrentStage == ProjectLifecycleStage.PostsGenerated ||
                p.CurrentStage == ProjectLifecycleStage.PostsApproved)
            .AsQueryable();

        if (!string.IsNullOrEmpty(userId))
            query = query.Where(p => p.CreatedBy == userId);

        var projects = await query
            .OrderBy(p => p.LastActivityAt)
            .Take(10)
            .ToListAsync();

        return _mapper.Map<List<ContentProjectDto>>(projects);
    }

    private int CalculateProgress(string stage)
    {
        var stateMachine = new ProjectStateMachine(stage);
        return stateMachine.GetProgressPercentage();
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