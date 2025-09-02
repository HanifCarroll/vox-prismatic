using System.ComponentModel.DataAnnotations;
using ContentCreation.Core.Entities;

namespace ContentCreation.Core.DTOs;

public class ContentProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> Tags { get; set; } = new();
    public string SourceType { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? FileName { get; set; }
    public string CurrentStage { get; set; } = string.Empty;
    public int OverallProgress { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public AutoApprovalSettingsDto AutoApprovalSettings { get; set; } = new();
    public PublishingScheduleDto PublishingSchedule { get; set; } = new();
    public List<string> TargetPlatforms { get; set; } = new() { "linkedin" };
    public ProjectSummaryDto Summary { get; set; } = new();
    public string? TranscriptId { get; set; }
    public List<string> InsightIds { get; set; } = new();
    public List<string> PostIds { get; set; } = new();
    public List<string> ScheduledPostIds { get; set; } = new();
}

public class ContentProjectDetailDto : ContentProjectDto
{
    public TranscriptSummaryDto? Transcript { get; set; }
    public List<InsightSummaryDto> Insights { get; set; } = new();
    public List<PostSummaryDto> Posts { get; set; } = new();
    public List<ScheduledPostSummaryDto> ScheduledPosts { get; set; } = new();
    public List<ProjectActivityDto> RecentActivities { get; set; } = new();
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
    public string? CreatedBy { get; set; }
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
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public int? Duration { get; set; }
}

public class InsightSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class PostSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string InsightId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? CharacterCount { get; set; }
}

public class ScheduledPostSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ProjectEventDto
{
    public string Id { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string? EventName { get; set; }
    public string? Description { get; set; }
    public DateTime OccurredAt { get; set; }
}