using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.DTOs.Posts;

public class PostDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string InsightId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectedBy { get; set; }
    public string? RejectedReason { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedReason { get; set; }
    public DateTime? FailedAt { get; set; }
    public string? QueueJobId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ScheduledPostDto>? ScheduledPosts { get; set; }
}

public class CreatePostDto
{
    [Required]
    [StringLength(100)]
    public string InsightId { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public Platform Platform { get; set; }

    [Required]
    [StringLength(10000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}

public class UpdatePostDto
{
    [StringLength(200, MinimumLength = 1)]
    public string? Title { get; set; }

    [StringLength(10000, MinimumLength = 1)]
    public string? Content { get; set; }

    public Platform? Platform { get; set; }
    
    public string? ErrorMessage { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectedBy { get; set; }
    public string? RejectedReason { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedReason { get; set; }
    public DateTime? FailedAt { get; set; }
}

public class PostFilterDto
{
    public string? Status { get; set; }
    public string? Platform { get; set; }
    public string? InsightId { get; set; }
    public string? ProjectId { get; set; }
    public bool? HasSchedule { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? SearchTerm { get; set; }
    public string? SortBy { get; set; } = "createdAt";
    public string? SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class SchedulePostDto
{
    [Required]
    public DateTime ScheduledTime { get; set; }
    
    public string? TimeZone { get; set; } = "UTC";
}

public class ScheduledPostDto
{
    public string Id { get; set; } = string.Empty;
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ExternalPostId { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class RejectPostDto
{
    public string? RejectedBy { get; set; }
    public string? Reason { get; set; }
}

public class ArchivePostDto
{
    public string? Reason { get; set; }
}

public class BulkPostOperationDto
{
    [Required]
    public BulkPostAction Action { get; set; }

    [Required]
    [MinLength(1)]
    public List<string> PostIds { get; set; } = new();

    public string? Reason { get; set; }
    public string? ReviewedBy { get; set; }
}

public class BulkOperationResponseDto
{
    public int UpdatedCount { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public List<string>? FailedIds { get; set; }
}

public class AvailableActionsDto
{
    public string CurrentState { get; set; } = string.Empty;
    public List<string> AvailableActions { get; set; } = new();
}

public enum Platform
{
    LinkedIn,
    X,
    Facebook,
    Instagram,
    TikTok
}

public enum PostStatus
{
    Draft,
    NeedsReview,
    Approved,
    Scheduled,
    Published,
    Failed,
    Archived
}

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