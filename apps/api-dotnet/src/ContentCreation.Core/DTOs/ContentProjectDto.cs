using System.ComponentModel.DataAnnotations;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.DTOs;

public class ContentProjectDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> Tags { get; set; } = new();
    public string SourceType { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? FileName { get; set; }
    public ProjectStage CurrentStage { get; set; }
    public int OverallProgress { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public AutoApprovalSettingsDto AutoApprovalSettings { get; set; } = new();
    public PublishingScheduleDto PublishingSchedule { get; set; } = new();
    public List<string> TargetPlatforms { get; set; } = new() { "linkedin" };
    public ProjectSummaryDto Summary { get; set; } = new();
    public Guid? TranscriptId { get; set; }
    public List<Guid> InsightIds { get; set; } = new();
    public List<Guid> PostIds { get; set; } = new();
    public List<Guid> ScheduledPostIds { get; set; } = new();
}

public class ContentProjectDetailDto : ContentProjectDto
{
    public TranscriptSummaryDto? Transcript { get; set; }
    public List<InsightSummaryDto> Insights { get; set; } = new();
    public List<PostSummaryDto> Posts { get; set; } = new();
    public List<ScheduledPostSummaryDto> ScheduledPosts { get; set; } = new();
    public List<ProjectActivityDto> RecentActivities { get; set; } = new();
    public ProjectMetricsDto? Metrics { get; set; }
}

public class CreateProjectDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public List<string> Tags { get; set; } = new();
    
    [Required]
    public string SourceType { get; set; } = "transcript";
    
    public string? SourceUrl { get; set; }
    
    public string? FileName { get; set; }
    
    public string? TranscriptContent { get; set; }
    
    public AutoApprovalSettingsDto? AutoApprovalSettings { get; set; }
    public PublishingScheduleDto? PublishingSchedule { get; set; }
    public List<string>? TargetPlatforms { get; set; }
    public WorkflowConfigurationDto? WorkflowConfig { get; set; }
}

public class UpdateProjectDto
{
    [MaxLength(200)]
    public string? Title { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public List<string>? Tags { get; set; }
    
    public AutoApprovalSettingsDto? AutoApprovalSettings { get; set; }
    public PublishingScheduleDto? PublishingSchedule { get; set; }
    public WorkflowConfigurationDto? WorkflowConfig { get; set; }
}

public class ProjectFilterDto
{
    public string? Stage { get; set; }
    public List<string>? Tags { get; set; }
    public string? SearchTerm { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public Guid? CreatedBy { get; set; }
    public bool? HasScheduledPosts { get; set; }
    public bool? HasPublishedPosts { get; set; }
    public string SortBy { get; set; } = "createdAt";
    public bool SortDescending { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class ProcessContentDto
{
    public bool CleanTranscript { get; set; } = true;
    public bool GenerateTitle { get; set; } = true;
}

public class AutoApprovalSettingsDto
{
    public bool AutoApproveInsights { get; set; }
    public int MinInsightScore { get; set; }
    public bool AutoGeneratePosts { get; set; }
    public bool AutoSchedulePosts { get; set; }
}

public class PublishingScheduleDto
{
    public List<DayOfWeek> PreferredDays { get; set; } = new();
    public string PreferredTime { get; set; } = "09:00";
    public string TimeZone { get; set; } = "UTC";
    public int MinimumInterval { get; set; } = 4;
}

public class ProjectSummaryDto
{
    public int InsightsTotal { get; set; }
    public int InsightsApproved { get; set; }
    public int PostsTotal { get; set; }
    public int PostsScheduled { get; set; }
    public int PostsPublished { get; set; }
}

public class TranscriptSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public TranscriptStatus Status { get; set; }
    public int WordCount { get; set; }
    public int? Duration { get; set; }
}

public class InsightSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public InsightStatus Status { get; set; }
}

public class PostSummaryDto
{
    public Guid Id { get; set; }
    public Guid InsightId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public PostStatus Status { get; set; }
    public int? CharacterCount { get; set; }
}

public class ScheduledPostSummaryDto
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public ScheduledPostStatus Status { get; set; }
}

public class ProjectEventDto
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? EventName { get; set; }
    public string? Description { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class ProjectActivityDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Metadata { get; set; }
    public DateTime OccurredAt { get; set; }
    public Guid? UserId { get; set; }
}