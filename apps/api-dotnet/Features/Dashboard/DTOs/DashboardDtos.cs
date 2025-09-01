namespace ContentCreation.Api.Features.Dashboard.DTOs;

public class ProjectOverviewDto
{
    public int TotalProjects { get; set; }
    public int ActiveProjects { get; set; }
    public int CompletedProjects { get; set; }
    public int DraftProjects { get; set; }
    
    public List<ProjectSummaryDto> RecentProjects { get; set; } = new();
    public List<ProjectSummaryDto> TopPerformingProjects { get; set; } = new();
    
    public PipelineMetricsDto PipelineMetrics { get; set; } = new();
    public ContentMetricsDto ContentMetrics { get; set; } = new();
    public EngagementSummaryDto EngagementSummary { get; set; } = new();
}

public class ProjectSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public int Progress { get; set; }
    public DateTime LastActivity { get; set; }
    public int PostsPublished { get; set; }
    public float EngagementRate { get; set; }
}

public class PipelineMetricsDto
{
    public int ProjectsInTranscriptProcessing { get; set; }
    public int ProjectsInInsightReview { get; set; }
    public int ProjectsInPostGeneration { get; set; }
    public int ProjectsInPostReview { get; set; }
    public int ProjectsScheduled { get; set; }
    public int ProjectsCompleted { get; set; }
    
    public float AverageProcessingTimeHours { get; set; }
    public float AverageTimeToPublishHours { get; set; }
}

public class ContentMetricsDto
{
    public int TotalTranscripts { get; set; }
    public int TotalInsights { get; set; }
    public int ApprovedInsights { get; set; }
    public int TotalPosts { get; set; }
    public int PublishedPosts { get; set; }
    public int ScheduledPosts { get; set; }
    
    public Dictionary<string, int> PostsByPlatform { get; set; } = new();
    public Dictionary<string, int> InsightsByCategory { get; set; } = new();
}

public class EngagementSummaryDto
{
    public int TotalViews { get; set; }
    public int TotalLikes { get; set; }
    public int TotalComments { get; set; }
    public int TotalShares { get; set; }
    public float AverageEngagementRate { get; set; }
    
    public List<DailyEngagementDto> Last30DaysEngagement { get; set; } = new();
    public Dictionary<string, float> EngagementByPlatform { get; set; } = new();
}

public class DailyEngagementDto
{
    public DateTime Date { get; set; }
    public int Views { get; set; }
    public int Likes { get; set; }
    public int Comments { get; set; }
    public int Shares { get; set; }
    public float EngagementRate { get; set; }
}

public class ActionItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "review_insight", "approve_post", "schedule_post", etc.
    public string Priority { get; set; } = string.Empty; // "high", "medium", "low"
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectTitle { get; set; } = string.Empty;
    public string? EntityId { get; set; } // Could be InsightId, PostId, etc.
    public string EntityType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? DueBy { get; set; }
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class ActionItemsResponseDto
{
    public List<ActionItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public ActionItemsSummaryDto Summary { get; set; } = new();
}

public class ActionItemsSummaryDto
{
    public int TotalPending { get; set; }
    public int HighPriority { get; set; }
    public int MediumPriority { get; set; }
    public int LowPriority { get; set; }
    public int Overdue { get; set; }
    public int DueToday { get; set; }
    public int DueThisWeek { get; set; }
    
    public Dictionary<string, int> ByType { get; set; } = new();
}

public class DashboardFiltersDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public List<string>? ProjectIds { get; set; }
    public List<string>? Platforms { get; set; }
    public string? UserId { get; set; }
}

public class QuickStatsDto
{
    public string Label { get; set; } = string.Empty;
    public object Value { get; set; } = 0;
    public string? Unit { get; set; }
    public float? ChangePercent { get; set; }
    public string? Trend { get; set; } // "up", "down", "stable"
    public string? Icon { get; set; }
    public string? Color { get; set; }
}