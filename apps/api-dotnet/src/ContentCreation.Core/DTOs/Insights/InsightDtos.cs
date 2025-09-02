using System.ComponentModel.DataAnnotations;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.DTOs.Insights;

public class InsightDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string TranscriptId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string VerbatimQuote { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int UrgencyScore { get; set; }
    public int RelatabilityScore { get; set; }
    public int SpecificityScore { get; set; }
    public int AuthorityScore { get; set; }
    public int? OverallScore { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public int? ProcessingDurationMs { get; set; }
    public int? EstimatedTokens { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? QueueJobId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateInsightDto
{
    [Required]
    public string ProjectId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string CleanedTranscriptId { get; set; } = string.Empty;

    [StringLength(100)]
    public string? TranscriptId { get; set; }

    public string? Status { get; set; }

    [StringLength(5000)]
    public string? Content { get; set; }

    public List<string>? Tags { get; set; }

    [Range(0, 1)]
    public double? Confidence { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string Summary { get; set; } = string.Empty;

    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string VerbatimQuote { get; set; } = string.Empty;

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    public string PostType { get; set; } = string.Empty;

    [Required]
    [Range(1, 10)]
    public int UrgencyScore { get; set; }

    [Required]
    [Range(1, 10)]
    public int RelatabilityScore { get; set; }

    [Required]
    [Range(1, 10)]
    public int SpecificityScore { get; set; }

    [Required]
    [Range(1, 10)]
    public int AuthorityScore { get; set; }

    public int? ProcessingDurationMs { get; set; }
    public int? EstimatedTokens { get; set; }
    public decimal? EstimatedCost { get; set; }
}

public class UpdateInsightDto
{
    public string? Status { get; set; }
    
    public DateTime? CreatedAt { get; set; }
    
    public string? TranscriptId { get; set; }

    [StringLength(200, MinimumLength = 1)]
    public string? Title { get; set; }

    [StringLength(1000, MinimumLength = 1)]
    public string? Summary { get; set; }

    [StringLength(2000, MinimumLength = 1)]
    public string? VerbatimQuote { get; set; }

    public string? Category { get; set; }
    public string? PostType { get; set; }

    [Range(1, 10)]
    public int? UrgencyScore { get; set; }

    [Range(1, 10)]
    public int? RelatabilityScore { get; set; }

    [Range(1, 10)]
    public int? SpecificityScore { get; set; }

    [Range(1, 10)]
    public int? AuthorityScore { get; set; }
}

public class InsightFilterDto
{
    public string? Status { get; set; }
    public string? Category { get; set; }
    public string? PostType { get; set; }
    public string? TranscriptId { get; set; }
    public string? ProjectId { get; set; }
    public bool? HasPosts { get; set; }
    public int? MinScore { get; set; }
    public int? MaxScore { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? SortBy { get; set; } = "createdAt";
    public string? SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class BulkInsightOperationDto
{
    [Required]
    public BulkInsightAction Action { get; set; }

    [Required]
    [MinLength(1)]
    public List<string> InsightIds { get; set; } = new();

    public string? Reason { get; set; }
    public string? ReviewedBy { get; set; }
}

public enum BulkInsightAction
{
    Approve,
    Reject,
    Archive,
    NeedsReview
}

public class BulkOperationResponseDto
{
    public int UpdatedCount { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public List<string>? FailedIds { get; set; }
}

public class ApproveInsightDto
{
    public string? ApprovedBy { get; set; }
    
    [Range(1, 10)]
    public int? Score { get; set; }
}

public class RejectInsightDto
{
    public string? ReviewedBy { get; set; }
    public string? Reason { get; set; }
}

public class ArchiveInsightDto
{
    public string? Reason { get; set; }
}

public class AvailableActionsDto
{
    public string CurrentState { get; set; } = string.Empty;
    public List<string> AvailableActions { get; set; } = new();
}

public enum InsightStatus
{
    Draft,
    NeedsReview,
    Approved,
    Rejected,
    Archived
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