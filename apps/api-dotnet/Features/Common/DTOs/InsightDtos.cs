using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs;

public record InsightDto(
    string Id,
    string ProjectId,
    string TranscriptId,
    string Title,
    string Summary,
    string VerbatimQuote,
    string Category,
    string PostType,
    InsightStatus Status,
    int UrgencyScore,
    int RelatabilityScore,
    int SpecificityScore,
    int AuthorityScore,
    int? OverallScore,
    string? ReviewedBy,
    DateTime? ReviewedAt,
    string? RejectionReason,
    int? ProcessingDurationMs,
    int? EstimatedTokens,
    decimal? EstimatedCost,
    string? QueueJobId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateInsightDto(
    [Required] string ProjectId,
    [Required][StringLength(100)] string CleanedTranscriptId,
    [StringLength(100)] string? TranscriptId = null,
    string? Status = null,
    [StringLength(5000)] string? Content = null,
    List<string>? Tags = null,
    [Range(0, 1)] double? Confidence = null,
    [Required][StringLength(200, MinimumLength = 1)] string Title = "",
    [Required][StringLength(1000, MinimumLength = 1)] string Summary = "",
    [Required][StringLength(2000, MinimumLength = 1)] string VerbatimQuote = "",
    [Required] string Category = "",
    [Required] string PostType = "",
    [Required][Range(1, 10)] int UrgencyScore = 5,
    [Required][Range(1, 10)] int RelatabilityScore = 5,
    [Required][Range(1, 10)] int SpecificityScore = 5,
    [Required][Range(1, 10)] int AuthorityScore = 5,
    int? ProcessingDurationMs = null,
    int? EstimatedTokens = null,
    decimal? EstimatedCost = null
);

public record UpdateInsightDto(
    string? Status = null,
    DateTime? CreatedAt = null,
    string? TranscriptId = null,
    [StringLength(200, MinimumLength = 1)] string? Title = null,
    [StringLength(1000, MinimumLength = 1)] string? Summary = null,
    [StringLength(2000, MinimumLength = 1)] string? VerbatimQuote = null,
    string? Category = null,
    string? PostType = null,
    [Range(1, 10)] int? UrgencyScore = null,
    [Range(1, 10)] int? RelatabilityScore = null,
    [Range(1, 10)] int? SpecificityScore = null,
    [Range(1, 10)] int? AuthorityScore = null
);

public record InsightFilter(
    string? Status = null,
    string? Category = null,
    string? PostType = null,
    string? TranscriptId = null,
    string? ProjectId = null,
    bool? HasPosts = null,
    int? MinScore = null,
    int? MaxScore = null,
    DateTime? CreatedAfter = null,
    DateTime? CreatedBefore = null,
    string SortBy = "createdAt",
    string SortOrder = "desc",
    int Page = 1,
    int PageSize = 50
);

public record BulkInsightOperation(
    [Required] BulkInsightAction Action,
    [Required][MinLength(1)] List<string> InsightIds,
    string? Reason = null,
    string? ReviewedBy = null
);

public record InsightBulkOperationResponse(
    int UpdatedCount,
    string Action,
    string Message,
    List<string>? FailedIds = null
);

public record ApproveInsight(
    string? ApprovedBy = null,
    [Range(1, 10)] int? Score = null
);

public record RejectInsight(
    string? ReviewedBy = null,
    string? Reason = null
);

public record ArchiveInsight(
    string? Reason = null
);

public record InsightAvailableActions(
    string CurrentState,
    List<string> Actions
);

public enum BulkInsightAction
{
    Approve,
    Reject,
    Archive,
    NeedsReview
}

public enum InsightAction
{
    SubmitForReview,
    Approve,
    Reject,
    Archive,
    Restore,
    Delete
}