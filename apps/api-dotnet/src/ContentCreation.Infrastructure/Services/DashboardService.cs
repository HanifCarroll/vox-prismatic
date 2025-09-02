using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs;
using ContentCreation.Core.DTOs.Dashboard;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DashboardService> _logger;
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(5);
    private readonly TimeSpan _statsCacheExpiration = TimeSpan.FromMinutes(2);

    public DashboardService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<DashboardService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<DashboardDataDto> GetDashboardDataAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:data", async entry =>
        {
            entry.SlidingExpiration = _cacheExpiration;
            _logger.LogInformation("Fetching fresh dashboard data");

            var counts = await GetCountsAsync();
            var activity = await GetActivityAsync();
            var stats = await GetStatsAsync();
            var workflowPipeline = await GetWorkflowPipelineStatsAsync();

            return new DashboardDataDto
            {
                Counts = counts,
                Activity = activity,
                Stats = stats,
                WorkflowPipeline = workflowPipeline
            };
        }) ?? new DashboardDataDto();
    }

    public async Task<DashboardCountsDto> GetCountsAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:counts", async entry =>
        {
            entry.SlidingExpiration = _statsCacheExpiration;
            _logger.LogInformation("Getting dashboard counts with aggregations");

            var transcriptCounts = await GetTranscriptCountsAsync();
            var insightCounts = await GetInsightCountsAsync();
            var postCounts = await GetPostCountsAsync();
            var scheduledCounts = await GetScheduledPostCountsAsync();

            return new DashboardCountsDto
            {
                Transcripts = transcriptCounts,
                Insights = insightCounts,
                Posts = postCounts,
                Scheduled = scheduledCounts
            };
        }) ?? new DashboardCountsDto();
    }

    public async Task<List<DashboardActivityDto>> GetActivityAsync(int limit = 10)
    {
        var cacheKey = $"dashboard:activity:{limit}";
        
        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.SlidingExpiration = _statsCacheExpiration;
            _logger.LogInformation("Getting recent activity (limit: {Limit})", limit);

            var recentPosts = await _context.Posts
                .OrderByDescending(p => p.CreatedAt)
                .Take(limit)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Status,
                    p.Platform,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .ToListAsync();

            var recentScheduled = await _context.ProjectScheduledPosts
                .Where(sp => sp.Status == "published" || sp.Status == "failed")
                .OrderByDescending(sp => sp.UpdatedAt)
                .Take(limit)
                .Include(sp => sp.Post)
                .ToListAsync();

            var recentInsights = await _context.Insights
                .OrderByDescending(i => i.CreatedAt)
                .Take(limit)
                .Select(i => new
                {
                    i.Id,
                    i.Title,
                    i.Status,
                    i.Category,
                    i.CreatedAt
                })
                .ToListAsync();

            var recentTranscripts = await _context.Transcripts
                .OrderByDescending(t => t.CreatedAt)
                .Take(limit)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Status,
                    t.SourceType,
                    t.CreatedAt
                })
                .ToListAsync();

            var activities = new List<DashboardActivityDto>();

            foreach (var post in recentPosts)
            {
                activities.Add(new DashboardActivityDto
                {
                    Id = post.Id,
                    Type = ActivityType.PostCreated,
                    Title = post.Title,
                    Timestamp = post.UpdatedAt.ToString("O"),
                    Status = post.Status
                });
            }

            foreach (var scheduled in recentScheduled)
            {
                var type = scheduled.Status == "published" 
                    ? ActivityType.PostPublished 
                    : ActivityType.PostFailed;
                
                activities.Add(new DashboardActivityDto
                {
                    Id = scheduled.Id,
                    Type = type,
                    Title = scheduled.Post?.Title ?? "Unknown Post",
                    Timestamp = scheduled.UpdatedAt.ToString("O"),
                    Status = scheduled.Status
                });
            }

            foreach (var insight in recentInsights)
            {
                activities.Add(new DashboardActivityDto
                {
                    Id = insight.Id,
                    Type = ActivityType.InsightCreated,
                    Title = insight.Title,
                    Timestamp = insight.CreatedAt.ToString("O"),
                    Status = insight.Status
                });
            }

            foreach (var transcript in recentTranscripts)
            {
                activities.Add(new DashboardActivityDto
                {
                    Id = transcript.Id,
                    Type = ActivityType.TranscriptCreated,
                    Title = transcript.Title ?? "Untitled Transcript",
                    Timestamp = transcript.CreatedAt.ToString("O"),
                    Status = transcript.Status
                });
            }

            return activities
                .OrderByDescending(a => DateTime.Parse(a.Timestamp))
                .Take(limit)
                .ToList();
        }) ?? new List<DashboardActivityDto>();
    }

    public async Task<DashboardActionableDto> GetActionableItemsAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:actionable", async entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromMinutes(1);
            _logger.LogInformation("Getting actionable items");

            var failedPosts = await _context.ProjectScheduledPosts
                .Where(sp => sp.Status == "failed")
                .Include(sp => sp.Post)
                .ToListAsync();

            var insightsToReview = await _context.Insights
                .Where(i => i.Status == "needs_review")
                .OrderBy(i => i.CreatedAt)
                .Take(20)
                .ToListAsync();

            var postsToReview = await _context.Posts
                .Where(p => p.Status == "needs_review")
                .OrderBy(p => p.CreatedAt)
                .Take(20)
                .ToListAsync();

            var rawTranscripts = await _context.Transcripts
                .Where(t => t.Status == "raw")
                .OrderBy(t => t.CreatedAt)
                .Take(10)
                .ToListAsync();

            var approvedPosts = await _context.Posts
                .Where(p => p.Status == "approved")
                .Where(p => !_context.ProjectScheduledPosts.Any(sp => sp.PostId == p.Id))
                .OrderByDescending(p => p.UpdatedAt)
                .Take(10)
                .ToListAsync();

            var urgent = new List<ActionableItemDto>();
            var needsReview = new List<ActionableItemDto>();
            var readyToProcess = new List<ActionableItemDto>();

            var failedByPlatform = failedPosts.GroupBy(fp => fp.Post?.Platform ?? "unknown");
            foreach (var group in failedByPlatform)
            {
                urgent.Add(new ActionableItemDto
                {
                    Id = $"failed-{group.Key}",
                    ActionType = ActionType.FixFailed,
                    Priority = ActionPriority.Urgent,
                    Title = $"{group.Count()} {group.Key} post{(group.Count() > 1 ? "s" : "")} failed to publish",
                    Context = group.First().ErrorMessage ?? "Check platform authentication",
                    Platform = group.Key,
                    ActionUrl = $"/content?view=posts&status=failed&platform={group.Key}",
                    ActionLabel = "Fix Now",
                    Timestamp = group.First().UpdatedAt.ToString("O"),
                    Count = group.Count()
                });
            }

            if (insightsToReview.Any())
            {
                needsReview.Add(new ActionableItemDto
                {
                    Id = "insights-review",
                    ActionType = ActionType.ReviewInsight,
                    Priority = ActionPriority.High,
                    Title = $"{insightsToReview.Count} insight{(insightsToReview.Count > 1 ? "s" : "")} awaiting review",
                    Context = $"Oldest: {insightsToReview.First().Title}",
                    ActionUrl = "/content?view=insights&status=needs_review",
                    ActionLabel = "Review",
                    Timestamp = insightsToReview.First().CreatedAt.ToString("O"),
                    Count = insightsToReview.Count
                });
            }

            if (postsToReview.Any())
            {
                needsReview.Add(new ActionableItemDto
                {
                    Id = "posts-review",
                    ActionType = ActionType.ReviewPost,
                    Priority = ActionPriority.High,
                    Title = $"{postsToReview.Count} post{(postsToReview.Count > 1 ? "s" : "")} need review",
                    Context = $"Oldest: {postsToReview.First().Title}",
                    ActionUrl = "/content?view=posts&status=needs_review",
                    ActionLabel = "Review",
                    Timestamp = postsToReview.First().CreatedAt.ToString("O"),
                    Count = postsToReview.Count
                });
            }

            if (rawTranscripts.Any())
            {
                readyToProcess.Add(new ActionableItemDto
                {
                    Id = "transcripts-process",
                    ActionType = ActionType.ProcessTranscript,
                    Priority = ActionPriority.Medium,
                    Title = $"{rawTranscripts.Count} transcript{(rawTranscripts.Count > 1 ? "s" : "")} ready to process",
                    Context = $"Oldest: {rawTranscripts.First().Title ?? "Untitled"}",
                    ActionUrl = "/content?view=transcripts&status=raw",
                    ActionLabel = "Process",
                    Timestamp = rawTranscripts.First().CreatedAt.ToString("O"),
                    Count = rawTranscripts.Count
                });
            }

            if (approvedPosts.Any())
            {
                readyToProcess.Add(new ActionableItemDto
                {
                    Id = "posts-schedule",
                    ActionType = ActionType.SchedulePost,
                    Priority = ActionPriority.Medium,
                    Title = $"{approvedPosts.Count} approved post{(approvedPosts.Count > 1 ? "s" : "")} ready to schedule",
                    Context = "No posts scheduled for today",
                    ActionUrl = "/scheduler",
                    ActionLabel = "Schedule",
                    Timestamp = approvedPosts.First().UpdatedAt.ToString("O"),
                    Count = approvedPosts.Count
                });
            }

            return new DashboardActionableDto
            {
                Urgent = urgent,
                NeedsReview = needsReview,
                ReadyToProcess = readyToProcess,
                TotalCount = urgent.Count + needsReview.Count + readyToProcess.Count
            };
        }) ?? new DashboardActionableDto();
    }

    public async Task<ContentCreation.Core.DTOs.Dashboard.PublishingScheduleDto> GetPublishingScheduleAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:publishing-schedule", async entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromMinutes(1);
            _logger.LogInformation("Getting publishing schedule");

            var now = DateTime.UtcNow;
            var startOfToday = now.Date;
            var endOfToday = startOfToday.AddDays(1).AddSeconds(-1);

            var startOfWeek = startOfToday.AddDays(-(int)startOfToday.DayOfWeek);
            var endOfWeek = startOfWeek.AddDays(7).AddSeconds(-1);

            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var endOfMonth = startOfMonth.AddMonths(1).AddSeconds(-1);

            var nextPost = await _context.ProjectScheduledPosts
                .Where(sp => sp.ScheduledTime >= now && sp.Status == "pending")
                .OrderBy(sp => sp.ScheduledTime)
                .Include(sp => sp.Post)
                .FirstOrDefaultAsync();

            var todayPosts = await _context.ProjectScheduledPosts
                .Where(sp => sp.ScheduledTime >= startOfToday && 
                            sp.ScheduledTime <= endOfToday && 
                            sp.Status == "pending")
                .OrderBy(sp => sp.ScheduledTime)
                .Include(sp => sp.Post)
                .ToListAsync();

            var weekPosts = await _context.ProjectScheduledPosts
                .Where(sp => sp.ScheduledTime >= startOfWeek && 
                            sp.ScheduledTime <= endOfWeek && 
                            sp.Status == "pending")
                .OrderBy(sp => sp.ScheduledTime)
                .Include(sp => sp.Post)
                .ToListAsync();

            var monthCount = await _context.ProjectScheduledPosts
                .CountAsync(sp => sp.ScheduledTime >= startOfMonth && 
                                sp.ScheduledTime <= endOfMonth && 
                                sp.Status == "pending");

            NextPostDto? nextPostDto = null;
            if (nextPost?.Post != null)
            {
                var minutesUntil = (int)(nextPost.ScheduledTime - now).TotalMinutes;
                var timeUntil = minutesUntil < 60 
                    ? $"in {minutesUntil} minute{(minutesUntil != 1 ? "s" : "")}"
                    : minutesUntil < 1440 
                        ? $"in {minutesUntil / 60} hour{(minutesUntil / 60 != 1 ? "s" : "")}"
                        : $"in {minutesUntil / 1440} day{(minutesUntil / 1440 != 1 ? "s" : "")}";

                nextPostDto = new NextPostDto
                {
                    Id = nextPost.Id,
                    Title = nextPost.Post.Title,
                    Platform = nextPost.Post.Platform,
                    ScheduledTime = nextPost.ScheduledTime.ToString("O"),
                    MinutesUntil = minutesUntil,
                    TimeUntil = timeUntil
                };
            }

            var todayHourly = new List<HourlySlotDto>();
            for (int hour = 0; hour < 24; hour++)
            {
                var hourPosts = todayPosts.Where(sp => sp.ScheduledTime.Hour == hour).ToList();
                var label = hour == 0 ? "12:00 AM" :
                           hour < 12 ? $"{hour}:00 AM" :
                           hour == 12 ? "12:00 PM" :
                           $"{hour - 12}:00 PM";

                todayHourly.Add(new HourlySlotDto
                {
                    Hour = hour,
                    Label = label,
                    Posts = hourPosts.Select(sp => new ScheduledPostSummaryDto
                    {
                        Id = sp.Id,
                        Platform = sp.Post?.Platform ?? "unknown",
                        Title = sp.Post?.Title ?? "Untitled"
                    }).ToList(),
                    Count = hourPosts.Count
                });
            }

            var weekDaily = new List<DailyScheduleDto>();
            var daysOfWeek = new[] { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };
            
            for (int dayOffset = 0; dayOffset < 7; dayOffset++)
            {
                var dayStart = startOfWeek.AddDays(dayOffset);
                var dayEnd = dayStart.AddDays(1).AddSeconds(-1);

                var dayPosts = weekPosts.Where(sp => sp.ScheduledTime >= dayStart && sp.ScheduledTime <= dayEnd).ToList();
                var byPlatform = dayPosts.GroupBy(sp => sp.Post?.Platform ?? "unknown")
                    .ToDictionary(g => g.Key, g => g.Count());

                weekDaily.Add(new DailyScheduleDto
                {
                    Date = dayStart.ToString("yyyy-MM-dd"),
                    DayName = daysOfWeek[(int)dayStart.DayOfWeek],
                    PostCount = dayPosts.Count,
                    ByPlatform = byPlatform,
                    IsToday = dayStart.Date == now.Date,
                    HasGap = dayPosts.Count == 0
                });
            }

            var weekPlatformDistribution = weekPosts
                .GroupBy(sp => sp.Post?.Platform ?? "unknown")
                .ToDictionary(g => g.Key, g => g.Count());

            var schedulingGaps = weekDaily
                .Where(d => d.HasGap && DateTime.Parse(d.Date) >= now.Date)
                .Select(d => d.Date)
                .ToList();

            return new PublishingScheduleDto
            {
                NextPost = nextPostDto,
                TodayHourly = todayHourly,
                WeekDaily = weekDaily,
                TodayCount = todayPosts.Count,
                WeekCount = weekPosts.Count,
                MonthCount = monthCount,
                WeekPlatformDistribution = weekPlatformDistribution,
                SchedulingGaps = schedulingGaps,
                SuggestedTimes = new List<string> { "9:00 AM", "12:00 PM", "5:00 PM" }
            };
        }) ?? new PublishingScheduleDto();
    }

    public async Task<DashboardStatsDto> GetStatsAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:stats", async entry =>
        {
            entry.SlidingExpiration = _cacheExpiration;
            _logger.LogInformation("Getting dashboard statistics");

            var transcriptCount = await _context.Transcripts.CountAsync();
            var insightCount = await _context.Insights.CountAsync();
            var postCount = await _context.Posts.CountAsync();
            var scheduledCount = await _context.ProjectScheduledPosts.CountAsync();

            return new DashboardStatsDto
            {
                Transcripts = new ItemStatDto { Count = transcriptCount },
                Insights = new ItemStatDto { Count = insightCount },
                Posts = new ItemStatDto { Count = postCount },
                ScheduledPosts = new ItemStatDto { Count = scheduledCount }
            };
        }) ?? new DashboardStatsDto();
    }

    public async Task<WorkflowPipelineStatsDto> GetWorkflowPipelineStatsAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:workflow-pipeline", async entry =>
        {
            entry.SlidingExpiration = _statsCacheExpiration;
            _logger.LogInformation("Getting workflow pipeline statistics");

            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            var rawInputCount = await _context.Transcripts.CountAsync(t => t.Status == "raw");
            var processingTranscripts = await _context.Transcripts.CountAsync(t => t.Status == "processing");
            var insightsNeedingReview = await _context.Insights.CountAsync(i => i.Status == "needs_review");
            var postsNeedingReview = await _context.Posts.CountAsync(p => p.Status == "needs_review");
            var approvedPosts = await _context.Posts.CountAsync(p => p.Status == "approved");
            var scheduledPosts = await _context.Posts.CountAsync(p => p.Status == "scheduled");
            var publishedThisWeek = await _context.ProjectScheduledPosts
                .CountAsync(sp => sp.Status == "published" && sp.UpdatedAt >= oneWeekAgo);

            return new WorkflowPipelineStatsDto
            {
                RawInput = rawInputCount,
                Processing = processingTranscripts,
                InsightsReview = insightsNeedingReview,
                PostsReview = postsNeedingReview,
                Approved = approvedPosts,
                Scheduled = scheduledPosts,
                Published = publishedThisWeek
            };
        }) ?? new WorkflowPipelineStatsDto();
    }

    public async Task<ProjectOverviewDto> GetProjectOverviewAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:project-overview", async entry =>
        {
            entry.SlidingExpiration = _statsCacheExpiration;
            _logger.LogInformation("Getting project overview");

            var totalProjects = await _context.ContentProjects.CountAsync();
            
            var projectsByStage = await _context.ContentProjects
                .GroupBy(p => p.CurrentStage)
                .Select(g => new { Stage = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Stage.ToString(), x => x.Count);

            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);
            var activeProjects = await _context.ContentProjects
                .CountAsync(p => p.LastActivityAt >= oneWeekAgo);

            var staleProjects = totalProjects - activeProjects;

            var recentProjects = await _context.ContentProjects
                .OrderByDescending(p => p.LastActivityAt)
                .Take(5)
                .Select(p => new Dashboard.ProjectSummaryDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    CurrentStage = p.CurrentStage,
                    OverallProgress = p.OverallProgress,
                    LastActivityAt = p.LastActivityAt,
                    Metrics = new ProjectMetricsDto
                    {
                        InsightsTotal = p.Insights.Count,
                        InsightsApproved = p.Insights.Count(i => i.Status == "approved"),
                        PostsTotal = p.Posts.Count,
                        PostsScheduled = p.ScheduledPosts.Count(sp => sp.Status == "pending"),
                        PostsPublished = p.ScheduledPosts.Count(sp => sp.Status == "published")
                    }
                })
                .ToListAsync();

            return new ProjectOverviewDto
            {
                TotalProjects = totalProjects,
                ProjectsByStage = projectsByStage,
                RecentProjects = recentProjects,
                ActiveProjects = activeProjects,
                StaleProjects = staleProjects
            };
        }) ?? new ProjectOverviewDto();
    }

    public async Task<List<ProjectActionItemDto>> GetActionItemsAsync()
    {
        return await _cache.GetOrCreateAsync("dashboard:action-items", async entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromMinutes(1);
            _logger.LogInformation("Getting project action items");

            var actionItems = new List<ProjectActionItemDto>();

            var projectsNeedingInsightReview = await _context.ContentProjects
                .Where(p => p.CurrentStage == ProjectLifecycleStage.InsightsReady)
                .Where(p => p.Insights.Any(i => i.Status == "needs_review"))
                .Select(p => new { p.Id, p.Title, p.CurrentStage })
                .ToListAsync();

            foreach (var project in projectsNeedingInsightReview)
            {
                actionItems.Add(new ProjectActionItemDto
                {
                    ProjectId = project.Id,
                    ProjectTitle = project.Title,
                    CurrentStage = project.CurrentStage,
                    RequiredAction = "Review insights",
                    Priority = ActionPriority.High,
                    ActionUrl = $"/projects/{project.Id}#insights"
                });
            }

            var projectsNeedingPostReview = await _context.ContentProjects
                .Where(p => p.CurrentStage == ProjectLifecycleStage.PostsGenerated)
                .Where(p => p.Posts.Any(post => post.Status == "needs_review"))
                .Select(p => new { p.Id, p.Title, p.CurrentStage })
                .ToListAsync();

            foreach (var project in projectsNeedingPostReview)
            {
                actionItems.Add(new ProjectActionItemDto
                {
                    ProjectId = project.Id,
                    ProjectTitle = project.Title,
                    CurrentStage = project.CurrentStage,
                    RequiredAction = "Review posts",
                    Priority = ActionPriority.High,
                    ActionUrl = $"/projects/{project.Id}#posts"
                });
            }

            var projectsReadyToSchedule = await _context.ContentProjects
                .Where(p => p.CurrentStage == ProjectLifecycleStage.PostsApproved)
                .Select(p => new { p.Id, p.Title, p.CurrentStage })
                .ToListAsync();

            foreach (var project in projectsReadyToSchedule)
            {
                actionItems.Add(new ProjectActionItemDto
                {
                    ProjectId = project.Id,
                    ProjectTitle = project.Title,
                    CurrentStage = project.CurrentStage,
                    RequiredAction = "Schedule posts",
                    Priority = ActionPriority.Medium,
                    ActionUrl = $"/projects/{project.Id}#schedule"
                });
            }

            return actionItems.OrderBy(a => a.Priority).ToList();
        }) ?? new List<ProjectActionItemDto>();
    }

    public async Task InvalidateCacheAsync()
    {
        var cacheKeys = new[]
        {
            "dashboard:data",
            "dashboard:counts",
            "dashboard:actionable",
            "dashboard:publishing-schedule",
            "dashboard:stats",
            "dashboard:workflow-pipeline",
            "dashboard:project-overview",
            "dashboard:action-items"
        };

        foreach (var key in cacheKeys)
        {
            _cache.Remove(key);
        }

        for (int i = 1; i <= 100; i++)
        {
            _cache.Remove($"dashboard:activity:{i}");
        }

        _logger.LogInformation("Dashboard cache invalidated");
    }

    private async Task<DashboardItemCountDto> GetTranscriptCountsAsync()
    {
        var counts = await _context.Transcripts
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var byStatus = new Dictionary<string, int>
        {
            ["raw"] = 0,
            ["processing"] = 0,
            ["cleaned"] = 0,
            ["insights_generated"] = 0,
            ["posts_created"] = 0,
            ["error"] = 0
        };

        foreach (var item in counts)
        {
            byStatus[item.Status] = item.Count;
        }

        return new DashboardItemCountDto
        {
            Total = byStatus.Values.Sum(),
            ByStatus = byStatus
        };
    }

    private async Task<DashboardItemCountDto> GetInsightCountsAsync()
    {
        var counts = await _context.Insights
            .GroupBy(i => i.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var byStatus = new Dictionary<string, int>
        {
            ["draft"] = 0,
            ["needs_review"] = 0,
            ["approved"] = 0,
            ["rejected"] = 0,
            ["archived"] = 0
        };

        foreach (var item in counts)
        {
            byStatus[item.Status] = item.Count;
        }

        return new DashboardItemCountDto
        {
            Total = byStatus.Values.Sum(),
            ByStatus = byStatus
        };
    }

    private async Task<DashboardItemCountDto> GetPostCountsAsync()
    {
        var counts = await _context.Posts
            .GroupBy(p => p.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var byStatus = new Dictionary<string, int>
        {
            ["draft"] = 0,
            ["needs_review"] = 0,
            ["approved"] = 0,
            ["scheduled"] = 0,
            ["published"] = 0,
            ["failed"] = 0,
            ["archived"] = 0
        };

        foreach (var item in counts)
        {
            byStatus[item.Status] = item.Count;
        }

        return new DashboardItemCountDto
        {
            Total = byStatus.Values.Sum(),
            ByStatus = byStatus
        };
    }

    private async Task<DashboardScheduledCountDto> GetScheduledPostCountsAsync()
    {
        var statusCounts = await _context.ProjectScheduledPosts
            .GroupBy(sp => sp.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var platformCounts = await _context.ProjectScheduledPosts
            .GroupBy(sp => sp.Platform)
            .Select(g => new { Platform = g.Key, Count = g.Count() })
            .ToListAsync();

        var now = DateTime.UtcNow;
        var startOfToday = now.Date;
        var endOfToday = startOfToday.AddDays(1).AddSeconds(-1);
        var tomorrow = now.AddDays(1);

        var startOfWeek = startOfToday.AddDays(-(int)startOfToday.DayOfWeek);
        var endOfWeek = startOfWeek.AddDays(7).AddSeconds(-1);

        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddSeconds(-1);

        var upcomingCount = await _context.ProjectScheduledPosts
            .CountAsync(sp => sp.ScheduledTime >= now && 
                            sp.ScheduledTime <= tomorrow && 
                            sp.Status == "pending");

        var todayCount = await _context.ProjectScheduledPosts
            .CountAsync(sp => sp.ScheduledTime >= startOfToday && 
                            sp.ScheduledTime <= endOfToday && 
                            sp.Status == "pending");

        var weekCount = await _context.ProjectScheduledPosts
            .CountAsync(sp => sp.ScheduledTime >= startOfWeek && 
                            sp.ScheduledTime <= endOfWeek && 
                            sp.Status == "pending");

        var monthCount = await _context.ProjectScheduledPosts
            .CountAsync(sp => sp.ScheduledTime >= startOfMonth && 
                            sp.ScheduledTime <= endOfMonth && 
                            sp.Status == "pending");

        return new DashboardScheduledCountDto
        {
            Total = statusCounts.Sum(sc => sc.Count),
            ByPlatform = platformCounts.ToDictionary(pc => pc.Platform, pc => pc.Count),
            Upcoming24h = upcomingCount,
            Today = todayCount,
            ThisWeek = weekCount,
            ThisMonth = monthCount
        };
    }
}