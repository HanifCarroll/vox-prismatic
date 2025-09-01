using Microsoft.EntityFrameworkCore;
using ContentCreation.Api.Features.Projects.DTOs;
using ContentCreation.Api.Features.Projects.Interfaces;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Features.Transcripts;
using AutoMapper;
using Hangfire;

namespace ContentCreation.Api.Features.Projects;

public class ContentProjectService : IContentProjectService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IBackgroundJobClient _backgroundJobs;
    private readonly ILogger<ContentProjectService> _logger;

    public ContentProjectService(
        ApplicationDbContext context,
        IMapper mapper,
        IBackgroundJobClient backgroundJobs,
        ILogger<ContentProjectService> logger)
    {
        _context = context;
        _mapper = mapper;
        _backgroundJobs = backgroundJobs;
        _logger = logger;
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

        await RecordProjectEventAsync(
            project.Id, 
            ProjectEventTypes.TranscriptUploaded, 
            "Project Created",
            new { source = dto.SourceType },
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
            .Include(p => p.Events.OrderByDescending(e => e.OccurredAt).Take(10))
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

        if (!ProjectLifecycleStage.IsValidTransition(project.CurrentStage, newStage))
            throw new InvalidOperationException($"Cannot transition from {project.CurrentStage} to {newStage}");

        var oldStage = project.CurrentStage;
        project.CurrentStage = newStage;
        project.OverallProgress = CalculateProgress(newStage);

        await _context.SaveChangesAsync();

        await RecordProjectEventAsync(
            projectId,
            ProjectEventTypes.StageChanged,
            $"Stage changed from {oldStage} to {newStage}",
            new { oldStage, newStage });

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> ProcessContentAsync(string projectId, ProcessContentDto dto)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        if (project.Transcript == null)
            throw new InvalidOperationException("Project has no transcript to process");

        await ChangeProjectStageAsync(projectId, ProjectLifecycleStage.ProcessingContent);

        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = ProcessingJobTypes.CleanTranscript,
            Status = ProcessingJobStatus.Queued
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();

        var hangfireJobId = _backgroundJobs.Enqueue<IContentProcessingService>(
            service => service.ProcessTranscriptAsync(projectId, job.Id));
        
        job.HangfireJobId = hangfireJobId;
        await _context.SaveChangesAsync();

        await RecordProjectEventAsync(
            projectId,
            ProjectEventTypes.AutomationTriggered,
            "Content processing started");

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> ExtractInsightsAsync(string projectId)
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
            JobType = ProcessingJobTypes.GenerateInsights,
            Status = ProcessingJobStatus.Queued
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();

        var hangfireJobId = _backgroundJobs.Enqueue<IContentProcessingService>(
            service => service.ExtractInsightsAsync(projectId, job.Id));
        
        job.HangfireJobId = hangfireJobId;
        await _context.SaveChangesAsync();

        await RecordProjectEventAsync(
            projectId,
            ProjectEventTypes.AutomationTriggered,
            "Insight extraction started");

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> GeneratePostsAsync(string projectId, List<string>? insightIds = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        var insights = insightIds != null 
            ? project.Insights.Where(i => insightIds.Contains(i.Id) && i.Status == "approved").ToList()
            : project.Insights.Where(i => i.Status == "approved").ToList();

        if (!insights.Any())
            throw new InvalidOperationException("No approved insights available for post generation");

        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = ProcessingJobTypes.GeneratePosts,
            Status = ProcessingJobStatus.Queued,
            Metadata = new { insightIds = insights.Select(i => i.Id).ToList() }
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();

        var hangfireJobId = _backgroundJobs.Enqueue<IContentProcessingService>(
            service => service.GeneratePostsAsync(projectId, job.Id, insights.Select(i => i.Id).ToList()));
        
        job.HangfireJobId = hangfireJobId;
        await _context.SaveChangesAsync();

        await RecordProjectEventAsync(
            projectId,
            ProjectEventTypes.AutomationTriggered,
            $"Post generation started for {insights.Count} insights");

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> SchedulePostsAsync(string projectId, List<string>? postIds = null)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        var posts = postIds != null
            ? project.Posts.Where(p => postIds.Contains(p.Id) && p.Status == "approved").ToList()
            : project.Posts.Where(p => p.Status == "approved").ToList();

        if (!posts.Any())
            throw new InvalidOperationException("No approved posts available for scheduling");

        await ChangeProjectStageAsync(projectId, ProjectLifecycleStage.Scheduled);

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

        await RecordProjectEventAsync(
            projectId,
            ProjectEventTypes.PostsScheduled,
            $"{posts.Count} posts scheduled for publishing");

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ContentProjectDto> PublishNowAsync(string projectId, List<string> postIds)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
            
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found");

        await ChangeProjectStageAsync(projectId, ProjectLifecycleStage.Publishing);

        foreach (var postId in postIds)
        {
            var hangfireJobId = _backgroundJobs.Enqueue<IPublishingService>(
                service => service.PublishPostAsync(projectId, postId));
        }

        await RecordProjectEventAsync(
            projectId,
            ProjectEventTypes.AutomationTriggered,
            $"Immediate publishing triggered for {postIds.Count} posts");

        return _mapper.Map<ContentProjectDto>(project);
    }

    public async Task<ProjectMetricsDto> UpdateProjectMetricsAsync(string projectId)
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

        await _context.SaveChangesAsync();

        return _mapper.Map<ProjectMetricsDto>(project.Metrics);
    }

    public async Task RecordProjectEventAsync(string projectId, string eventType, string? eventName, object? eventData = null, string? userId = null)
    {
        var projectEvent = new ProjectEvent
        {
            ProjectId = projectId,
            EventType = eventType,
            EventName = eventName,
            Description = eventName,
            UserId = userId,
            EventData = eventData,
            OccurredAt = DateTime.UtcNow
        };

        _context.ProjectEvents.Add(projectEvent);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ProjectEventDto>> GetProjectEventsAsync(string projectId, int limit = 20)
    {
        var events = await _context.ProjectEvents
            .Where(e => e.ProjectId == projectId)
            .OrderByDescending(e => e.OccurredAt)
            .Take(limit)
            .ToListAsync();

        return _mapper.Map<List<ProjectEventDto>>(events);
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
        return stage switch
        {
            ProjectLifecycleStage.RawContent => 0,
            ProjectLifecycleStage.ProcessingContent => 10,
            ProjectLifecycleStage.InsightsReady => 25,
            ProjectLifecycleStage.InsightsApproved => 40,
            ProjectLifecycleStage.PostsGenerated => 55,
            ProjectLifecycleStage.PostsApproved => 70,
            ProjectLifecycleStage.Scheduled => 85,
            ProjectLifecycleStage.Publishing => 95,
            ProjectLifecycleStage.Published => 100,
            ProjectLifecycleStage.Archived => 100,
            _ => 0
        };
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

public interface IContentProcessingService
{
    Task ProcessTranscriptAsync(string projectId, string jobId);
    Task ExtractInsightsAsync(string projectId, string jobId);
    Task GeneratePostsAsync(string projectId, string jobId, List<string> insightIds);
}

public interface IPublishingService
{
    Task PublishPostAsync(string projectId, string postId);
}