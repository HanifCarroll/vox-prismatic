using ContentCreation.Core.Enums;

namespace ContentCreation.Core.DTOs.Dashboard;

public class DashboardDataDto
{
    public DashboardCountsDto Counts { get; set; } = new();
    public List<DashboardActivityDto> Activity { get; set; } = new();
    public DashboardStatsDto Stats { get; set; } = new();
    public WorkflowPipelineStatsDto WorkflowPipeline { get; set; } = new();
}

public class DashboardCountsDto
{
    public DashboardItemCountDto Transcripts { get; set; } = new();
    public DashboardItemCountDto Insights { get; set; } = new();
    public DashboardItemCountDto Posts { get; set; } = new();
    public DashboardScheduledCountDto Scheduled { get; set; } = new();
}

public class DashboardItemCountDto
{
    public int Total { get; set; }
    public Dictionary<string, int> ByStatus { get; set; } = new();
}

public class DashboardScheduledCountDto
{
    public int Total { get; set; }
    public Dictionary<string, int> ByPlatform { get; set; } = new();
    public int Upcoming24h { get; set; }
    public int Today { get; set; }
    public int ThisWeek { get; set; }
    public int ThisMonth { get; set; }
}

public class DashboardActivityDto
{
    public string Id { get; set; } = string.Empty;
    public ActivityType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public enum ActivityType
{
    PostCreated,
    PostScheduled,
    PostPublished,
    PostFailed,
    InsightCreated,
    TranscriptCreated
}

public class DashboardStatsDto
{
    public ItemStatDto Transcripts { get; set; } = new();
    public ItemStatDto Insights { get; set; } = new();
    public ItemStatDto Posts { get; set; } = new();
    public ItemStatDto ScheduledPosts { get; set; } = new();
}

public class ItemStatDto
{
    public int Count { get; set; }
}

public class DashboardActionableDto
{
    public List<ActionableItemDto> Urgent { get; set; } = new();
    public List<ActionableItemDto> NeedsReview { get; set; } = new();
    public List<ActionableItemDto> ReadyToProcess { get; set; } = new();
    public int TotalCount { get; set; }
}

public class ActionableItemDto
{
    public string Id { get; set; } = string.Empty;
    public ActionType ActionType { get; set; }
    public ActionPriority Priority { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Context { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public string ActionUrl { get; set; } = string.Empty;
    public string ActionLabel { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public int Count { get; set; }
}

public enum ActionType
{
    FixFailed,
    ReviewInsight,
    ReviewPost,
    ProcessTranscript,
    SchedulePost
}

public enum ActionPriority
{
    Urgent,
    High,
    Medium,
    Low
}

public class PublishingScheduleDto
{
    public NextPostDto? NextPost { get; set; }
    public List<HourlySlotDto> TodayHourly { get; set; } = new();
    public List<DailyScheduleDto> WeekDaily { get; set; } = new();
    public int TodayCount { get; set; }
    public int WeekCount { get; set; }
    public int MonthCount { get; set; }
    public Dictionary<string, int> WeekPlatformDistribution { get; set; } = new();
    public List<string> SchedulingGaps { get; set; } = new();
    public List<string> SuggestedTimes { get; set; } = new();
}

public class NextPostDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string ScheduledTime { get; set; } = string.Empty;
    public int MinutesUntil { get; set; }
    public string TimeUntil { get; set; } = string.Empty;
}

public class HourlySlotDto
{
    public int Hour { get; set; }
    public string Label { get; set; } = string.Empty;
    public List<ScheduledPostSummaryDto> Posts { get; set; } = new();
    public int Count { get; set; }
}

public class ScheduledPostSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
}

public class DailyScheduleDto
{
    public string Date { get; set; } = string.Empty;
    public string DayName { get; set; } = string.Empty;
    public int PostCount { get; set; }
    public Dictionary<string, int> ByPlatform { get; set; } = new();
    public bool IsToday { get; set; }
    public bool HasGap { get; set; }
}

public class WorkflowPipelineStatsDto
{
    public int RawInput { get; set; }
    public int Processing { get; set; }
    public int InsightsReview { get; set; }
    public int PostsReview { get; set; }
    public int Approved { get; set; }
    public int Scheduled { get; set; }
    public int Published { get; set; }
}

public class ProjectOverviewDto
{
    public int TotalProjects { get; set; }
    public Dictionary<string, int> ProjectsByStage { get; set; } = new();
    public List<ProjectSummaryDto> RecentProjects { get; set; } = new();
    public int ActiveProjects { get; set; }
    public int StaleProjects { get; set; }
}

public class ProjectSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public int OverallProgress { get; set; }
    public DateTime LastActivityAt { get; set; }
    public ProjectMetricsDto Metrics { get; set; } = new();
}

public class ProjectMetricsDto
{
    public int InsightsTotal { get; set; }
    public int InsightsApproved { get; set; }
    public int PostsTotal { get; set; }
    public int PostsScheduled { get; set; }
    public int PostsPublished { get; set; }
}

public class ProjectActionItemDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectTitle { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public string RequiredAction { get; set; } = string.Empty;
    public ActionPriority Priority { get; set; }
    public string ActionUrl { get; set; } = string.Empty;
    public DateTime? DeadlineAt { get; set; }
}