using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class ProjectEventRepository : Repository<ProjectEvent>, IProjectEventRepository
{
    public ProjectEventRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<ProjectEvent>> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .Where(pe => pe.ProjectId == projectId)
            .OrderByDescending(pe => pe.OccurredAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectEvent>> GetByEventTypeAsync(string eventType)
    {
        return await _dbSet
            .Where(pe => pe.EventType == eventType)
            .OrderByDescending(pe => pe.OccurredAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectEvent>> GetRecentEventsAsync(int count)
    {
        return await _dbSet
            .OrderByDescending(pe => pe.OccurredAt)
            .Take(count)
            .ToListAsync();
    }
}

public class ProjectMetricsRepository : Repository<ProjectMetrics>, IProjectMetricsRepository
{
    public ProjectMetricsRepository(ApplicationDbContext context) : base(context) { }

    public async Task<ProjectMetrics?> GetByProjectIdAsync(string projectId)
    {
        // ProjectMetrics is embedded in ContentProject
        var project = await _context.ContentProjects
            .FirstOrDefaultAsync(p => p.Id == projectId);
        return project?.Metrics;
    }

    public async Task UpdateMetricsAsync(string projectId, Action<ProjectMetrics> updateAction)
    {
        var project = await _context.ContentProjects
            .FirstOrDefaultAsync(p => p.Id == projectId);
        if (project?.Metrics != null)
        {
            updateAction(project.Metrics);
            await _context.SaveChangesAsync();
        }
    }
}

public class ProjectProcessingJobRepository : Repository<ProjectProcessingJob>, IProjectProcessingJobRepository
{
    public ProjectProcessingJobRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<ProjectProcessingJob>> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .Where(j => j.ProjectId == projectId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectProcessingJob>> GetPendingJobsAsync()
    {
        return await _dbSet
            .Where(j => j.Status == "pending")
            .OrderBy(j => j.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectProcessingJob>> GetByJobTypeAsync(string jobType)
    {
        return await _dbSet
            .Where(j => j.JobType == jobType)
            .OrderBy(j => j.CreatedAt)
            .ToListAsync();
    }

    public async Task<ProjectProcessingJob?> GetActiveJobForProjectAsync(string projectId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(j => j.ProjectId == projectId && j.Status == "processing");
    }
}

public class ProjectScheduledPostRepository : Repository<ProjectScheduledPost>, IProjectScheduledPostRepository
{
    public ProjectScheduledPostRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<ProjectScheduledPost>> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .Where(psp => psp.ProjectId == projectId)
            .OrderBy(psp => psp.ScheduledTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectScheduledPost>> GetUpcomingPostsAsync(string projectId)
    {
        return await _dbSet
            .Where(psp => psp.ProjectId == projectId && psp.ScheduledTime > DateTime.UtcNow)
            .OrderBy(psp => psp.ScheduledTime)
            .ToListAsync();
    }
}

public class SettingRepository : Repository<Setting>, ISettingRepository
{
    public SettingRepository(ApplicationDbContext context) : base(context) { }

    public async Task<Setting?> GetByKeyAsync(string key)
    {
        return await _dbSet
            .FirstOrDefaultAsync(s => s.Key == key);
    }

    public async Task<Dictionary<string, string>> GetAllSettingsAsync()
    {
        var settings = await _dbSet.ToListAsync();
        return settings.ToDictionary(s => s.Key, s => s.Value);
    }

    public async Task UpdateSettingAsync(string key, string value)
    {
        var setting = await GetByKeyAsync(key);
        if (setting != null)
        {
            setting.Value = value;
            setting.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            await AddAsync(new Setting
            {
                Key = key,
                Value = value,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }
}

public class AnalyticsEventRepository : Repository<AnalyticsEvent>, IAnalyticsEventRepository
{
    public AnalyticsEventRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<AnalyticsEvent>> GetByDateRangeAsync(DateTime start, DateTime end)
    {
        return await _dbSet
            .Where(ae => ae.OccurredAt >= start && ae.OccurredAt <= end)
            .OrderBy(ae => ae.OccurredAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<AnalyticsEvent>> GetByEventTypeAsync(string eventType)
    {
        return await _dbSet
            .Where(ae => ae.EventType == eventType)
            .OrderByDescending(ae => ae.OccurredAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<AnalyticsEvent>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet
            // AnalyticsEvent doesn't have a UserId property
            .OrderByDescending(ae => ae.OccurredAt)
            .ToListAsync();
    }
}

public class PlatformAuthRepository : Repository<PlatformAuth>, IPlatformAuthRepository
{
    public PlatformAuthRepository(ApplicationDbContext context) : base(context) { }

    public async Task<PlatformAuth?> GetByPlatformAsync(string platform)
    {
        return await _dbSet
            .FirstOrDefaultAsync(pa => pa.Platform == platform);
    }

    public async Task<IEnumerable<PlatformAuth>> GetActiveAuthsAsync()
    {
        return await _dbSet
            // PlatformAuth doesn't have IsActive property - returning all
            .ToListAsync();
    }
}

public class WorkflowConfigurationRepository : Repository<WorkflowConfiguration>, IWorkflowConfigurationRepository
{
    public WorkflowConfigurationRepository(ApplicationDbContext context) : base(context) { }

    public async Task<WorkflowConfiguration?> GetByProjectIdAsync(string projectId)
    {
        // WorkflowConfiguration is embedded in ContentProject, not a separate entity
        var project = await _context.ContentProjects
            .FirstOrDefaultAsync(p => p.Id == projectId);
        return project?.WorkflowConfig;
    }

    public async Task<IEnumerable<WorkflowConfiguration>> GetActiveConfigurationsAsync()
    {
        // WorkflowConfiguration is embedded, return all from projects
        var projects = await _context.ContentProjects.ToListAsync();
        return projects.Select(p => p.WorkflowConfig).ToList();
    }
}