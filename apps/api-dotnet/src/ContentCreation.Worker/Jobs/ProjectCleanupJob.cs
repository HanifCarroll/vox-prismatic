using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Worker.Jobs;

public class ProjectCleanupJob
{
    private readonly ILogger<ProjectCleanupJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public ProjectCleanupJob(
        ILogger<ProjectCleanupJob> logger,
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _configuration = configuration;
    }

    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task CleanupOldProjects()
    {
        _logger.LogInformation("Starting project cleanup job");
        
        var retentionDays = _configuration.GetValue<int>("ProjectRetentionDays", 90);
        var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
        
        // Archive completed projects older than retention period
        var projectsToArchive = await _context.ContentProjects
            .Where(p => p.CurrentStage == "published" || p.CurrentStage == "completed")
            .Where(p => p.UpdatedAt < cutoffDate)
            .ToListAsync();
        
        if (projectsToArchive.Any())
        {
            _logger.LogInformation("Archiving {Count} old projects", projectsToArchive.Count);
            
            foreach (var project in projectsToArchive)
            {
                project.CurrentStage = "archived";
                project.UpdatedAt = DateTime.UtcNow;
                
                await LogProjectEvent(
                    project.Id,
                    "project_archived",
                    $"Project archived after {retentionDays} days of inactivity");
            }
            
            await _context.SaveChangesAsync();
        }
        
        // Clean up failed jobs older than 30 days
        var failedJobCutoff = DateTime.UtcNow.AddDays(-30);
        var failedJobs = await _context.ProjectProcessingJobs
            .Where(j => j.Status == "failed")
            .Where(j => j.CreatedAt < failedJobCutoff)
            .ToListAsync();
        
        if (failedJobs.Any())
        {
            _logger.LogInformation("Removing {Count} old failed jobs", failedJobs.Count);
            _context.ProjectProcessingJobs.RemoveRange(failedJobs);
            await _context.SaveChangesAsync();
        }
        
        // Clean up old events (keep last 1000 per project)
        var projectIds = await _context.ContentProjects
            .Select(p => p.Id)
            .ToListAsync();
        
        foreach (var projectId in projectIds)
        {
            var activitiesToKeep = await _context.ProjectActivities
                .Where(a => a.ProjectId == projectId)
                .OrderByDescending(a => a.OccurredAt)
                .Take(1000)
                .Select(a => a.Id)
                .ToListAsync();
            
            var activitiesToDelete = await _context.ProjectActivities
                .Where(a => a.ProjectId == projectId)
                .Where(a => !activitiesToKeep.Contains(a.Id))
                .ToListAsync();
            
            if (activitiesToDelete.Any())
            {
                _logger.LogDebug("Removing {Count} old activities for project {ProjectId}", 
                    activitiesToDelete.Count, projectId);
                _context.ProjectActivities.RemoveRange(activitiesToDelete);
            }
        }
        
        await _context.SaveChangesAsync();
        
        // Clean up orphaned transcripts, insights, and posts
        var orphanedTranscripts = await _context.Transcripts
            .Where(t => !_context.ContentProjects.Any(p => p.TranscriptId == t.Id))
            .ToListAsync();
        
        if (orphanedTranscripts.Any())
        {
            _logger.LogWarning("Removing {Count} orphaned transcripts", orphanedTranscripts.Count);
            _context.Transcripts.RemoveRange(orphanedTranscripts);
        }
        
        var orphanedInsights = await _context.Insights
            .Where(i => !_context.ContentProjects.Any(p => p.Id == i.ProjectId))
            .ToListAsync();
        
        if (orphanedInsights.Any())
        {
            _logger.LogWarning("Removing {Count} orphaned insights", orphanedInsights.Count);
            _context.Insights.RemoveRange(orphanedInsights);
        }
        
        var orphanedPosts = await _context.Posts
            .Where(p => !_context.ContentProjects.Any(cp => cp.Id == p.ProjectId))
            .ToListAsync();
        
        if (orphanedPosts.Any())
        {
            _logger.LogWarning("Removing {Count} orphaned posts", orphanedPosts.Count);
            _context.Posts.RemoveRange(orphanedPosts);
        }
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Project cleanup job completed");
    }

    private async Task LogProjectEvent(string projectId, string eventType, string description)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = projectId,
            ActivityType = eventType,
            ActivityName = description,
            Description = description,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
}