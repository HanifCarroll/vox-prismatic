using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Api.Features.Dashboard.DTOs;
using ContentCreation.Api.Features.Projects.Interfaces;
using ContentCreation.Api.Features.Insights.Interfaces;
using ContentCreation.Api.Features.Posts.Interfaces;
using ContentCreation.Api.Features.Analytics.Interfaces;
using ContentCreation.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Dashboard;

[ApiController]
[Route("dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IContentProjectService _projectService;
    private readonly IInsightService _insightService;
    private readonly IPostService _postService;
    private readonly IAnalyticsService _analyticsService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        IContentProjectService projectService,
        IInsightService insightService,
        IPostService postService,
        IAnalyticsService analyticsService,
        ApplicationDbContext context,
        ILogger<DashboardController> logger)
    {
        _projectService = projectService;
        _insightService = insightService;
        _postService = postService;
        _analyticsService = analyticsService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive dashboard overview
    /// </summary>
    [HttpGet("project-overview")]
    [ProducesResponseType(typeof(ProjectOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjectOverview([FromQuery] DashboardFiltersDto? filters = null)
    {
        try
        {
            filters ??= new DashboardFiltersDto();
            var userId = User.Identity?.Name ?? "system";
            
            var overview = await BuildProjectOverviewAsync(filters, userId);
            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project overview");
            return StatusCode(500, new { error = "Failed to retrieve project overview" });
        }
    }

    /// <summary>
    /// Get action items requiring user attention
    /// </summary>
    [HttpGet("action-items")]
    [ProducesResponseType(typeof(ActionItemsResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActionItems(
        [FromQuery] string? priority = null,
        [FromQuery] string? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
            var actionItems = await GetActionItemsAsync(userId, priority, type, page, pageSize);
            
            return Ok(actionItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving action items");
            return StatusCode(500, new { error = "Failed to retrieve action items" });
        }
    }

    /// <summary>
    /// Get quick stats for dashboard widgets
    /// </summary>
    [HttpGet("quick-stats")]
    [ProducesResponseType(typeof(List<QuickStatsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuickStats()
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
            var stats = await GetQuickStatsAsync(userId);
            
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quick stats");
            return StatusCode(500, new { error = "Failed to retrieve quick stats" });
        }
    }

    /// <summary>
    /// Get pipeline metrics
    /// </summary>
    [HttpGet("pipeline-metrics")]
    [ProducesResponseType(typeof(PipelineMetricsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPipelineMetrics()
    {
        try
        {
            var metrics = await GetPipelineMetricsAsync();
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pipeline metrics");
            return StatusCode(500, new { error = "Failed to retrieve pipeline metrics" });
        }
    }

    /// <summary>
    /// Get content metrics
    /// </summary>
    [HttpGet("content-metrics")]
    [ProducesResponseType(typeof(ContentMetricsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContentMetrics([FromQuery] DashboardFiltersDto? filters = null)
    {
        try
        {
            filters ??= new DashboardFiltersDto();
            var metrics = await GetContentMetricsAsync(filters);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving content metrics");
            return StatusCode(500, new { error = "Failed to retrieve content metrics" });
        }
    }

    /// <summary>
    /// Get engagement summary
    /// </summary>
    [HttpGet("engagement-summary")]
    [ProducesResponseType(typeof(EngagementSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEngagementSummary([FromQuery] DashboardFiltersDto? filters = null)
    {
        try
        {
            filters ??= new DashboardFiltersDto();
            var summary = await GetEngagementSummaryAsync(filters);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving engagement summary");
            return StatusCode(500, new { error = "Failed to retrieve engagement summary" });
        }
    }

    private async Task<ProjectOverviewDto> BuildProjectOverviewAsync(DashboardFiltersDto filters, string userId)
    {
        var projectsQuery = _context.Set<Projects.ContentProject>().AsQueryable();
        
        if (filters.ProjectIds?.Any() == true)
        {
            projectsQuery = projectsQuery.Where(p => filters.ProjectIds.Contains(p.Id));
        }
        
        if (filters.StartDate.HasValue)
        {
            projectsQuery = projectsQuery.Where(p => p.CreatedAt >= filters.StartDate.Value);
        }
        
        if (filters.EndDate.HasValue)
        {
            projectsQuery = projectsQuery.Where(p => p.CreatedAt <= filters.EndDate.Value);
        }

        var projects = await projectsQuery.ToListAsync();
        
        var overview = new ProjectOverviewDto
        {
            TotalProjects = projects.Count,
            ActiveProjects = projects.Count(p => p.CurrentStage != "completed" && p.CurrentStage != "archived"),
            CompletedProjects = projects.Count(p => p.CurrentStage == "completed"),
            DraftProjects = projects.Count(p => p.CurrentStage == "draft"),
            PipelineMetrics = await GetPipelineMetricsAsync(),
            ContentMetrics = await GetContentMetricsAsync(filters),
            EngagementSummary = await GetEngagementSummaryAsync(filters)
        };

        // Get recent projects
        overview.RecentProjects = projects
            .OrderByDescending(p => p.LastActivityAt ?? p.UpdatedAt)
            .Take(5)
            .Select(p => new ProjectSummaryDto
            {
                Id = p.Id,
                Title = p.Title,
                CurrentStage = p.CurrentStage,
                Progress = p.OverallProgress,
                LastActivity = p.LastActivityAt ?? p.UpdatedAt,
                PostsPublished = p.Metrics?.PostsPublished ?? 0,
                EngagementRate = 0 // Would calculate from analytics
            })
            .ToList();

        // Get top performing projects (by engagement)
        overview.TopPerformingProjects = projects
            .Where(p => p.Metrics?.PostsPublished > 0)
            .OrderByDescending(p => p.Metrics?.PostsPublished ?? 0)
            .Take(5)
            .Select(p => new ProjectSummaryDto
            {
                Id = p.Id,
                Title = p.Title,
                CurrentStage = p.CurrentStage,
                Progress = p.OverallProgress,
                LastActivity = p.LastActivityAt ?? p.UpdatedAt,
                PostsPublished = p.Metrics?.PostsPublished ?? 0,
                EngagementRate = 0 // Would calculate from analytics
            })
            .ToList();

        return overview;
    }

    private async Task<ActionItemsResponseDto> GetActionItemsAsync(
        string userId, 
        string? priority, 
        string? type,
        int page,
        int pageSize)
    {
        var actionItems = new List<ActionItemDto>();
        
        // Get insights needing review
        var pendingInsights = await _context.Set<Insights.Insight>()
            .Where(i => i.Status == "pending_review")
            .Include(i => i.Project)
            .OrderBy(i => i.CreatedAt)
            .Take(10)
            .ToListAsync();

        foreach (var insight in pendingInsights)
        {
            actionItems.Add(new ActionItemDto
            {
                Id = Guid.NewGuid().ToString(),
                Type = "review_insight",
                Priority = insight.TotalScore > 20 ? "high" : "medium",
                Title = "Review Insight",
                Description = $"Review insight: {insight.Title}",
                ProjectId = insight.ProjectId,
                ProjectTitle = insight.Project?.Title ?? "Unknown",
                EntityId = insight.Id,
                EntityType = "insight",
                CreatedAt = insight.CreatedAt,
                Status = "pending"
            });
        }

        // Get posts needing approval
        var pendingPosts = await _context.Set<Posts.Post>()
            .Where(p => p.Status == "pending_review" || p.Status == "draft")
            .Include(p => p.Project)
            .OrderBy(p => p.CreatedAt)
            .Take(10)
            .ToListAsync();

        foreach (var post in pendingPosts)
        {
            actionItems.Add(new ActionItemDto
            {
                Id = Guid.NewGuid().ToString(),
                Type = "approve_post",
                Priority = "medium",
                Title = "Approve Post",
                Description = $"Review and approve post for {post.Platform}",
                ProjectId = post.ProjectId,
                ProjectTitle = post.Project?.Title ?? "Unknown",
                EntityId = post.Id,
                EntityType = "post",
                CreatedAt = post.CreatedAt,
                Status = "pending"
            });
        }

        // Get posts ready to schedule
        var approvedPosts = await _context.Set<Posts.Post>()
            .Where(p => p.Status == "approved" && p.PublishedAt == null)
            .Include(p => p.Project)
            .OrderBy(p => p.UpdatedAt)
            .Take(10)
            .ToListAsync();

        foreach (var post in approvedPosts)
        {
            actionItems.Add(new ActionItemDto
            {
                Id = Guid.NewGuid().ToString(),
                Type = "schedule_post",
                Priority = "low",
                Title = "Schedule Post",
                Description = $"Schedule approved post for {post.Platform}",
                ProjectId = post.ProjectId,
                ProjectTitle = post.Project?.Title ?? "Unknown",
                EntityId = post.Id,
                EntityType = "post",
                CreatedAt = post.UpdatedAt,
                Status = "pending"
            });
        }

        // Apply filters
        if (!string.IsNullOrEmpty(priority))
        {
            actionItems = actionItems.Where(i => i.Priority == priority).ToList();
        }
        
        if (!string.IsNullOrEmpty(type))
        {
            actionItems = actionItems.Where(i => i.Type == type).ToList();
        }

        var totalCount = actionItems.Count;
        var paginatedItems = actionItems
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var summary = new ActionItemsSummaryDto
        {
            TotalPending = actionItems.Count,
            HighPriority = actionItems.Count(i => i.Priority == "high"),
            MediumPriority = actionItems.Count(i => i.Priority == "medium"),
            LowPriority = actionItems.Count(i => i.Priority == "low"),
            Overdue = actionItems.Count(i => i.DueBy < DateTime.UtcNow),
            DueToday = actionItems.Count(i => i.DueBy?.Date == DateTime.UtcNow.Date),
            DueThisWeek = actionItems.Count(i => i.DueBy?.Date <= DateTime.UtcNow.AddDays(7).Date),
            ByType = actionItems.GroupBy(i => i.Type).ToDictionary(g => g.Key, g => g.Count())
        };

        return new ActionItemsResponseDto
        {
            Items = paginatedItems,
            TotalCount = totalCount,
            Summary = summary
        };
    }

    private async Task<List<QuickStatsDto>> GetQuickStatsAsync(string userId)
    {
        var stats = new List<QuickStatsDto>();
        
        var activeProjects = await _context.Set<Projects.ContentProject>()
            .CountAsync(p => p.CurrentStage != "completed" && p.CurrentStage != "archived");
        
        stats.Add(new QuickStatsDto
        {
            Label = "Active Projects",
            Value = activeProjects,
            Icon = "folder",
            Color = "blue",
            Trend = "stable"
        });

        var postsThisWeek = await _context.Set<Posts.Post>()
            .CountAsync(p => p.PublishedAt >= DateTime.UtcNow.AddDays(-7));
        
        stats.Add(new QuickStatsDto
        {
            Label = "Posts This Week",
            Value = postsThisWeek,
            Icon = "document",
            Color = "green",
            Trend = "up",
            ChangePercent = 15.5f
        });

        var pendingReviews = await _context.Set<Insights.Insight>()
            .CountAsync(i => i.Status == "pending_review");
        
        stats.Add(new QuickStatsDto
        {
            Label = "Pending Reviews",
            Value = pendingReviews,
            Icon = "eye",
            Color = "yellow",
            Trend = pendingReviews > 10 ? "up" : "stable"
        });

        var totalEngagement = await _context.Set<Posts.Post>()
            .Where(p => p.PublishedAt != null)
            .SumAsync(p => (p.EngagementMetrics != null ? p.EngagementMetrics.Likes : 0) +
                         (p.EngagementMetrics != null ? p.EngagementMetrics.Comments : 0) +
                         (p.EngagementMetrics != null ? p.EngagementMetrics.Shares : 0));
        
        stats.Add(new QuickStatsDto
        {
            Label = "Total Engagement",
            Value = totalEngagement,
            Icon = "heart",
            Color = "red",
            Trend = "up",
            ChangePercent = 8.2f
        });

        return stats;
    }

    private async Task<PipelineMetricsDto> GetPipelineMetricsAsync()
    {
        var projects = await _context.Set<Projects.ContentProject>().ToListAsync();
        
        return new PipelineMetricsDto
        {
            ProjectsInTranscriptProcessing = projects.Count(p => p.CurrentStage == "transcript_processing"),
            ProjectsInInsightReview = projects.Count(p => p.CurrentStage == "insight_review"),
            ProjectsInPostGeneration = projects.Count(p => p.CurrentStage == "post_generation"),
            ProjectsInPostReview = projects.Count(p => p.CurrentStage == "post_review"),
            ProjectsScheduled = projects.Count(p => p.CurrentStage == "scheduled"),
            ProjectsCompleted = projects.Count(p => p.CurrentStage == "completed"),
            AverageProcessingTimeHours = projects
                .Where(p => p.Metrics?.TotalProcessingTimeMs > 0)
                .Select(p => p.Metrics.TotalProcessingTimeMs / 3600000f)
                .DefaultIfEmpty(0)
                .Average(),
            AverageTimeToPublishHours = 48 // Would calculate from actual data
        };
    }

    private async Task<ContentMetricsDto> GetContentMetricsAsync(DashboardFiltersDto filters)
    {
        var transcriptsQuery = _context.Set<Transcripts.Transcript>().AsQueryable();
        var insightsQuery = _context.Set<Insights.Insight>().AsQueryable();
        var postsQuery = _context.Set<Posts.Post>().AsQueryable();
        
        if (filters.ProjectIds?.Any() == true)
        {
            transcriptsQuery = transcriptsQuery.Where(t => filters.ProjectIds.Contains(t.ProjectId));
            insightsQuery = insightsQuery.Where(i => filters.ProjectIds.Contains(i.ProjectId));
            postsQuery = postsQuery.Where(p => filters.ProjectIds.Contains(p.ProjectId));
        }

        var metrics = new ContentMetricsDto
        {
            TotalTranscripts = await transcriptsQuery.CountAsync(),
            TotalInsights = await insightsQuery.CountAsync(),
            ApprovedInsights = await insightsQuery.CountAsync(i => i.IsApproved),
            TotalPosts = await postsQuery.CountAsync(),
            PublishedPosts = await postsQuery.CountAsync(p => p.PublishedAt != null),
            ScheduledPosts = await postsQuery.CountAsync(p => p.Status == "scheduled")
        };

        metrics.PostsByPlatform = await postsQuery
            .GroupBy(p => p.Platform)
            .Select(g => new { Platform = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Platform, x => x.Count);

        metrics.InsightsByCategory = await insightsQuery
            .GroupBy(i => i.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Category, x => x.Count);

        return metrics;
    }

    private async Task<EngagementSummaryDto> GetEngagementSummaryAsync(DashboardFiltersDto filters)
    {
        var postsQuery = _context.Set<Posts.Post>()
            .Where(p => p.PublishedAt != null && p.EngagementMetrics != null);
        
        if (filters.ProjectIds?.Any() == true)
        {
            postsQuery = postsQuery.Where(p => filters.ProjectIds.Contains(p.ProjectId));
        }
        
        if (filters.StartDate.HasValue)
        {
            postsQuery = postsQuery.Where(p => p.PublishedAt >= filters.StartDate.Value);
        }
        
        if (filters.EndDate.HasValue)
        {
            postsQuery = postsQuery.Where(p => p.PublishedAt <= filters.EndDate.Value);
        }

        var posts = await postsQuery.ToListAsync();
        
        var summary = new EngagementSummaryDto
        {
            TotalViews = posts.Sum(p => p.EngagementMetrics?.Views ?? 0),
            TotalLikes = posts.Sum(p => p.EngagementMetrics?.Likes ?? 0),
            TotalComments = posts.Sum(p => p.EngagementMetrics?.Comments ?? 0),
            TotalShares = posts.Sum(p => p.EngagementMetrics?.Shares ?? 0),
            AverageEngagementRate = posts.Any() 
                ? posts.Average(p => p.EngagementMetrics?.EngagementRate ?? 0) 
                : 0
        };

        // Calculate last 30 days engagement
        var last30Days = DateTime.UtcNow.AddDays(-30);
        summary.Last30DaysEngagement = posts
            .Where(p => p.PublishedAt >= last30Days)
            .GroupBy(p => p.PublishedAt!.Value.Date)
            .Select(g => new DailyEngagementDto
            {
                Date = g.Key,
                Views = g.Sum(p => p.EngagementMetrics?.Views ?? 0),
                Likes = g.Sum(p => p.EngagementMetrics?.Likes ?? 0),
                Comments = g.Sum(p => p.EngagementMetrics?.Comments ?? 0),
                Shares = g.Sum(p => p.EngagementMetrics?.Shares ?? 0),
                EngagementRate = g.Average(p => p.EngagementMetrics?.EngagementRate ?? 0)
            })
            .OrderBy(d => d.Date)
            .ToList();

        // Calculate engagement by platform
        summary.EngagementByPlatform = posts
            .GroupBy(p => p.Platform)
            .ToDictionary(
                g => g.Key,
                g => g.Average(p => p.EngagementMetrics?.EngagementRate ?? 0)
            );

        return summary;
    }
}