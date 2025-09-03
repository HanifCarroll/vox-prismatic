using System.ComponentModel.DataAnnotations;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.DTOs.Transcripts;

public class TranscriptDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string RawContent { get; set; } = string.Empty;
    public string? CleanedContent { get; set; }
    public TranscriptStatus Status { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? FileName { get; set; }
    public int WordCount { get; set; }
    public int? Duration { get; set; }
    public int? ProcessingDurationMs { get; set; }
    public int? EstimatedTokens { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? QueueJobId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? FailedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTranscriptDto
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public string RawContent { get; set; } = string.Empty;

    public SourceType SourceType { get; set; } = SourceType.Manual;

    [Url]
    public string? SourceUrl { get; set; }

    public string? FileName { get; set; }

    [Range(1, int.MaxValue)]
    public int? Duration { get; set; }

    public string? ProjectId { get; set; }
}

public class UpdateTranscriptDto
{
    [StringLength(500, MinimumLength = 1)]
    public string? Title { get; set; }

    [MinLength(1)]
    public string? RawContent { get; set; }

    public string? CleanedContent { get; set; }
    
    public int? ProcessingDurationMs { get; set; }
    public int? EstimatedTokens { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? QueueJobId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? FailedAt { get; set; }
}

public class TranscriptFilterDto
{
    public string? Status { get; set; }
    public string? SourceType { get; set; }
    public string? ProjectId { get; set; }
    public bool? HasCleanedContent { get; set; }
    public bool? HasError { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? SearchTerm { get; set; }
    public string? SortBy { get; set; } = "createdAt";
    public string? SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class TranscriptStatsDto
{
    public int Total { get; set; }
    public int Raw { get; set; }
    public int Processing { get; set; }
    public int Cleaned { get; set; }
    public int InsightsGenerated { get; set; }
    public int PostsCreated { get; set; }
    public int Error { get; set; }
    public Dictionary<string, int> BySourceType { get; set; } = new();
}

public class CreateTranscriptResponseDto
{
    public bool Success { get; set; }
    public TranscriptDto Data { get; set; } = new();
    public ProcessingInfoDto Processing { get; set; } = new();
}

public class ProcessingInfoDto
{
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Workflow { get; set; } = string.Empty;
}

public class MarkCleanedDto
{
    public string? CleanedContent { get; set; }
}

public class MarkFailedDto
{
    [Required]
    public string ErrorMessage { get; set; } = string.Empty;
}

public enum SourceType
{
    Manual,
    Audio,
    Video,
    Url,
    File
}

public enum TranscriptStatus
{
    Raw,
    Processing,
    Cleaned,
    InsightsGenerated,
    PostsCreated,
    Error
}

public enum TranscriptAction
{
    StartProcessing,
    MarkCleaned,
    MarkFailed,
    MarkInsightsGenerated,
    MarkPostsCreated,
    Retry,
    Delete
}