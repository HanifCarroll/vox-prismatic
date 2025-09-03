using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs;

public record PostDto(
    string Id,
    string ProjectId,
    string InsightId,
    string Title,
    string Content,
    SocialPlatform Platform,
    PostStatus Status,
    bool IsApproved,
    DateTime? ScheduledFor,
    string? ErrorMessage,
    DateTime? RejectedAt,
    string? RejectedBy,
    string? RejectedReason,
    DateTime? ApprovedAt,
    string? ApprovedBy,
    DateTime? ArchivedAt,
    string? ArchivedReason,
    DateTime? FailedAt,
    string? QueueJobId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<ScheduledPostDto>? ScheduledPosts = null
);

public record CreatePostDto(
    [Required] string ProjectId,
    [Required][StringLength(100)] string InsightId,
    [Required][StringLength(200, MinimumLength = 1)] string Title,
    PostStatus? Status = null,
    bool IsApproved = false,
    [Required] SocialPlatform Platform = SocialPlatform.LinkedIn,
    [Required][StringLength(10000, MinimumLength = 1)] string Content = "",
    List<string>? Hashtags = null
)
{
    public List<string> Hashtags { get; init; } = Hashtags ?? new();
}

public record UpdatePostDto(
    [StringLength(200, MinimumLength = 1)] string? Title = null,
    [StringLength(10000, MinimumLength = 1)] string? Content = null,
    SocialPlatform? Platform = null,
    string? Status = null,
    bool? IsApproved = null,
    DateTime? ScheduledFor = null,
    string? ErrorMessage = null,
    DateTime? RejectedAt = null,
    string? RejectedBy = null,
    string? RejectedReason = null,
    DateTime? ApprovedAt = null,
    string? ApprovedBy = null,
    DateTime? ArchivedAt = null,
    string? ArchivedReason = null,
    DateTime? FailedAt = null
);

public record PostFilter(
    string? Status = null,
    SocialPlatform? Platform = null,
    string? InsightId = null,
    string? ProjectId = null,
    bool? HasSchedule = null,
    DateTime? CreatedAfter = null,
    DateTime? CreatedBefore = null,
    string? SearchTerm = null,
    string SortBy = "createdAt",
    string SortOrder = "desc",
    int Page = 1,
    int PageSize = 50
);

public record SchedulePostDto(
    [Required] DateTime ScheduledTime,
    string TimeZone = "UTC"
);

public record ScheduledPostDto(
    string Id,
    string PostId,
    SocialPlatform Platform,
    DateTime ScheduledTime,
    string Status,
    string? ExternalPostId,
    string? ErrorMessage,
    int RetryCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record RejectPost(
    string? RejectedBy = null,
    string? Reason = null
);

public record ArchivePost(
    string? Reason = null
);

public record BulkPostOperation(
    [Required] BulkPostAction Action,
    [Required][MinLength(1)] List<string> PostIds,
    string? Reason = null,
    string? ReviewedBy = null
);

public record PostBulkOperationResponse(
    int UpdatedCount,
    string Action,
    string Message,
    List<string>? FailedIds = null
);

public record PostAvailableActions(
    string CurrentState,
    List<string> Actions
);

public enum BulkPostAction
{
    Approve,
    Reject,
    Archive,
    SubmitForReview,
    Schedule,
    Unschedule
}

public enum PostAction
{
    SubmitForReview,
    Approve,
    Reject,
    Archive,
    Edit,
    Schedule,
    Unschedule,
    Delete
}