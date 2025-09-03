using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs;

public record ContentProjectDto(
    Guid Id,
    string Title,
    string? Description,
    List<string> Tags,
    string SourceType,
    string? SourceUrl,
    string? FileName,
    ProjectStage CurrentStage,
    int OverallProgress,
    Guid CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? LastActivityAt,
    AutoApprovalSettings AutoApprovalSettings,
    PublishingSchedule PublishingSchedule,
    List<SocialPlatform> TargetPlatforms,
    ProjectSummary Summary,
    Guid? TranscriptId,
    List<Guid> InsightIds,
    List<Guid> PostIds,
    List<Guid> ScheduledPostIds
);

public record ContentProjectDetailDto(
    Guid Id,
    string Title,
    string? Description,
    List<string> Tags,
    string SourceType,
    string? SourceUrl,
    string? FileName,
    ProjectStage CurrentStage,
    int OverallProgress,
    Guid CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? LastActivityAt,
    AutoApprovalSettings AutoApprovalSettings,
    PublishingSchedule PublishingSchedule,
    List<SocialPlatform> TargetPlatforms,
    ProjectSummary Summary,
    Guid? TranscriptId,
    List<Guid> InsightIds,
    List<Guid> PostIds,
    List<Guid> ScheduledPostIds,
    TranscriptSummary? Transcript,
    List<InsightSummary> Insights,
    List<PostSummary> Posts,
    List<ScheduledPostSummary> ScheduledPosts,
    List<ProjectActivity> RecentActivities
);

public record CreateProjectDto(
    [Required][MaxLength(200)] string Title,
    [MaxLength(1000)] string? Description = null,
    List<string>? Tags = null,
    [Required] string SourceType = "transcript",
    string? SourceUrl = null,
    string? FileName = null,
    string? TranscriptContent = null,
    AutoApprovalSettings? AutoApprovalSettings = null,
    PublishingSchedule? PublishingSchedule = null,
    List<SocialPlatform>? TargetPlatforms = null
);

public record UpdateProjectDto(
    [MaxLength(200)] string? Title = null,
    [MaxLength(1000)] string? Description = null,
    List<string>? Tags = null,
    AutoApprovalSettings? AutoApprovalSettings = null,
    PublishingSchedule? PublishingSchedule = null
);

public record ProjectFilter(
    string? Stage = null,
    List<string>? Tags = null,
    string? SearchTerm = null,
    DateTime? CreatedAfter = null,
    DateTime? CreatedBefore = null,
    Guid? CreatedBy = null,
    bool? HasScheduledPosts = null,
    bool? HasPublishedPosts = null,
    string SortBy = "createdAt",
    bool SortDescending = true,
    int Page = 1,
    int PageSize = 20
);

public record ProcessContentDto(
    bool CleanTranscript = true,
    bool GenerateTitle = true
);

public record AutoApprovalSettings(
    bool AutoApproveInsights = false,
    int MinInsightScore = 70,
    bool AutoGeneratePosts = false,
    bool AutoSchedulePosts = false
);

public record PublishingSchedule(
    List<DayOfWeek> PreferredDays,
    string PreferredTime = "09:00",
    string TimeZone = "UTC",
    int MinimumInterval = 4
);

public record ProjectSummary(
    int InsightsTotal,
    int InsightsApproved,
    int PostsTotal,
    int PostsScheduled,
    int PostsPublished
);

public record TranscriptSummary(
    Guid Id,
    string Title,
    TranscriptStatus Status,
    int WordCount,
    int? Duration
);

public record InsightSummary(
    Guid Id,
    string Title,
    string Category,
    string PostType,
    int TotalScore,
    InsightStatus Status
);

public record PostSummary(
    Guid Id,
    Guid InsightId,
    string Title,
    SocialPlatform Platform,
    PostStatus Status,
    int? CharacterCount
);

public record ScheduledPostSummary(
    Guid Id,
    Guid PostId,
    SocialPlatform Platform,
    DateTime ScheduledTime,
    ScheduledPostStatus Status
);

public record ProjectActivity(
    Guid Id,
    Guid ProjectId,
    ProjectActivityType ActivityType,
    string? Description,
    string? Metadata,
    DateTime OccurredAt,
    Guid? UserId
);

// Project action DTOs
public record ExtractInsightsDto(
    int MaxInsights = 10,
    int MinScore = 70,
    bool AutoApprove = false
);

public record GeneratePostsDto(
    List<string>? InsightIds = null,
    List<SocialPlatform>? Platforms = null,
    bool GenerateVariations = false
)
{
    public List<SocialPlatform> Platforms { get; init; } = Platforms ?? new() { SocialPlatform.LinkedIn, SocialPlatform.Twitter };
}

public record SchedulePostsDto(
    List<string>? PostIds = null,
    DateTime? StartDate = null,
    int? IntervalHours = null,
    bool UseOptimalTiming = true
);

public record PublishNowDto(
    [Required] List<string> PostIds,
    bool PublishToAllPlatforms = true
);

public record ApproveInsightsDto(
    [Required] List<string> InsightIds,
    string? ReviewNote = null
);

public record RejectInsightsDto(
    [Required] List<string> InsightIds,
    string? RejectionReason = null
);

public record ApprovePostsDto(
    [Required] List<string> PostIds,
    string? ReviewNote = null,
    bool AutoSchedule = false
);

public record RejectPostsDto(
    [Required] List<string> PostIds,
    string? RejectionReason = null,
    bool RegenerateFromInsights = false
);

public record ArchiveProjectDto(
    string? ArchiveReason = null,
    bool PreserveData = true
);

public record RestoreProjectDto(
    bool ResetProgress = false,
    string? RestoreReason = null
);

public record ProjectActionResult(
    string ProjectId,
    string CurrentStage,
    string PreviousStage,
    int OverallProgress,
    List<string> AvailableActions,
    string Message,
    bool Success,
    object? ActionData = null
);

public record ProjectState(
    string ProjectId,
    string CurrentStage,
    int OverallProgress,
    List<string> AvailableActions,
    bool RequiresUserAction,
    bool IsInFinalState
);

public record BulkProjectAction(
    [Required] List<string> ProjectIds,
    string Action,
    object? ActionParameters = null
);