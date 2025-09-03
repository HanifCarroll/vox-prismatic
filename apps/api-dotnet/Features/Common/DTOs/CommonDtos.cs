using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs;

// Transcripts
public record TranscriptDto(
    string Id,
    string ProjectId,
    string Title,
    string RawContent,
    string? CleanedContent,
    TranscriptStatus Status,
    string SourceType,
    string? SourceUrl,
    string? FileName,
    int WordCount,
    int? Duration,
    int? ProcessingDurationMs,
    int? EstimatedTokens,
    decimal? EstimatedCost,
    string? QueueJobId,
    string? ErrorMessage,
    DateTime? FailedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateTranscriptDto(
    [Required][StringLength(500, MinimumLength = 1)] string Title,
    [Required][MinLength(1)] string RawContent,
    SourceType SourceType = SourceType.Manual,
    [Url] string? SourceUrl = null,
    string? FileName = null,
    [Range(1, int.MaxValue)] int? Duration = null,
    string? ProjectId = null
);

public record UpdateTranscriptDto(
    [StringLength(500, MinimumLength = 1)] string? Title = null,
    [MinLength(1)] string? RawContent = null,
    string? CleanedContent = null,
    int? ProcessingDurationMs = null,
    int? EstimatedTokens = null,
    decimal? EstimatedCost = null,
    string? QueueJobId = null,
    string? ErrorMessage = null,
    DateTime? FailedAt = null
);

public record TranscriptFilter(
    string? Status = null,
    string? SourceType = null,
    string? ProjectId = null,
    bool? HasCleanedContent = null,
    bool? HasError = null,
    DateTime? CreatedAfter = null,
    DateTime? CreatedBefore = null,
    string? SearchTerm = null,
    string SortBy = "createdAt",
    string SortOrder = "desc",
    int Page = 1,
    int PageSize = 50
);

public record TranscriptStats(
    int Total,
    int Raw,
    int Processing,
    int Cleaned,
    int InsightsGenerated,
    int PostsCreated,
    int Error,
    Dictionary<string, int> BySourceType
)
{
    public Dictionary<string, int> BySourceType { get; init; } = BySourceType ?? new();
}

public record CreateTranscriptResponse(
    bool Success,
    TranscriptDto Data,
    ProcessingInfo Processing
);

public record ProcessingInfo(
    string Status,
    string Message,
    string Workflow
);

public record MarkCleaned(
    string? CleanedContent = null
);

public record MarkFailed(
    [Required] string ErrorMessage
);

// Authentication
public record RegisterRequest(
    [Required][EmailAddress] string Email,
    [Required][MinLength(3)][MaxLength(100)] string Username,
    [Required][MinLength(8)] string Password,
    [MaxLength(100)] string? FirstName = null,
    [MaxLength(100)] string? LastName = null
);

public record LoginRequest(
    [Required] string EmailOrUsername,
    [Required] string Password
);

public record RefreshTokenRequest(
    [Required] string RefreshToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record UserDto(
    Guid Id,
    string Email,
    string Username,
    string? FirstName,
    string? LastName,
    bool EmailVerified,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required][MinLength(8)] string NewPassword
);

public record ForgotPasswordRequest(
    [Required][EmailAddress] string Email
);

public record ResetPasswordRequest(
    [Required] string Token,
    [Required][MinLength(8)] string NewPassword
);

public record VerifyEmailRequest(
    [Required] string Token
);

public record ResendVerificationRequest(
    [Required][EmailAddress] string Email
);

public record LinkedInAuthResponse(
    bool Success,
    string? AccessToken = null,
    string? RefreshToken = null,
    DateTime? ExpiresAt = null,
    string? ProfileId = null,
    string? ProfileName = null,
    string? ProfileUrl = null,
    string? Error = null
);

public record LinkedInStatusResponse(
    bool IsConnected,
    string? ProfileId = null,
    string? ProfileName = null,
    string? ProfileUrl = null,
    DateTime? ConnectedAt = null,
    DateTime? TokenExpiresAt = null
);

// AI DTOs
public record CleanTranscriptRequest(
    string RawContent,
    string? SourceType = null,
    Dictionary<string, object>? Options = null
)
{
    public Dictionary<string, object>? Options { get; init; } = Options ?? new();
}

public record CleanTranscriptResult(
    string CleanedContent,
    int WordCount,
    List<string> RemovedSections,
    Dictionary<string, object>? Metadata = null
)
{
    public List<string> RemovedSections { get; init; } = RemovedSections ?? new();
    public Dictionary<string, object>? Metadata { get; init; } = Metadata ?? new();
}

public record ExtractInsightsRequest(
    string Content,
    int MaxInsights = 5,
    List<string>? Topics = null,
    Dictionary<string, object>? Options = null
)
{
    public List<string>? Topics { get; init; } = Topics ?? new();
    public Dictionary<string, object>? Options { get; init; } = Options ?? new();
}

public record ExtractedInsight(
    string Title,
    string Content,
    string Summary,
    string Category,
    string PostType,
    string VerbatimQuote,
    List<string> Tags,
    double ConfidenceScore,
    int UrgencyScore,
    int RelatabilityScore,
    int SpecificityScore,
    int AuthorityScore,
    Dictionary<string, object>? Metadata = null
)
{
    public List<string> Tags { get; init; } = Tags ?? new();
    public Dictionary<string, object>? Metadata { get; init; } = Metadata ?? new();
}

public record ExtractInsightsResult(
    List<ExtractedInsight> Insights,
    int TotalExtracted,
    Dictionary<string, object>? Metadata = null
)
{
    public List<ExtractedInsight> Insights { get; init; } = Insights ?? new();
    public Dictionary<string, object>? Metadata { get; init; } = Metadata ?? new();
}

public record GeneratePostsRequest(
    List<ExtractedInsight> Insights,
    List<SocialPlatform> Platforms,
    Dictionary<string, object>? Options = null
)
{
    public List<ExtractedInsight> Insights { get; init; } = Insights ?? new();
    public List<SocialPlatform> Platforms { get; init; } = Platforms ?? new();
    public Dictionary<string, object>? Options { get; init; } = Options ?? new();
}

public record GeneratedPost(
    SocialPlatform Platform,
    string Content,
    string? Title = null,
    List<string>? Hashtags = null,
    string? MediaUrl = null,
    Dictionary<string, object>? Metadata = null
)
{
    public List<string>? Hashtags { get; init; } = Hashtags ?? new();
    public Dictionary<string, object>? Metadata { get; init; } = Metadata ?? new();
}

public record GeneratePostsResult(
    List<GeneratedPost> Posts,
    int TotalGenerated,
    Dictionary<string, object>? Metadata = null
)
{
    public List<GeneratedPost> Posts { get; init; } = Posts ?? new();
    public Dictionary<string, object>? Metadata { get; init; } = Metadata ?? new();
}

// Queue DTOs
public record QueueStats(
    int PendingCount,
    int ProcessingCount,
    int CompletedCount,
    int FailedCount,
    int TotalCount,
    string? QueueName = null,
    DateTime LastUpdated = default
);

public record JobDetails(
    string Id,
    string Type,
    string Status,
    DateTime CreatedAt,
    string? Queue = null,
    DateTime? StartedAt = null,
    DateTime? CompletedAt = null,
    int? DurationMs = null,
    int RetryCount = 0,
    string? Error = null,
    string? StackTrace = null,
    Dictionary<string, object>? Metadata = null,
    List<string>? Arguments = null,
    string? Result = null
)
{
    public Dictionary<string, object>? Metadata { get; init; } = Metadata ?? new();
    public List<string>? Arguments { get; init; } = Arguments ?? new();
}

// Enums
public enum SourceType
{
    Manual,
    Audio,
    Video,
    Url,
    File
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