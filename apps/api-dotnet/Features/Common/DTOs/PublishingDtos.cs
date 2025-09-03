using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs;

// Core publishing DTOs
public record PublishNow(
    Guid PostId,
    List<SocialPlatform> Platforms,
    bool IgnoreSchedule = false,
    Dictionary<string, object>? PlatformOptions = null
)
{
    public List<SocialPlatform> Platforms { get; init; } = Platforms ?? new();
}

public record SchedulePost(
    Guid PostId,
    DateTime PublishAt,
    List<SocialPlatform> Platforms,
    string? TimeZone = null,
    bool OptimizeTime = false,
    Dictionary<string, object>? PlatformOptions = null
)
{
    public DateTime ScheduledTime => PublishAt; // Alias for compatibility
    public List<SocialPlatform> Platforms { get; init; } = Platforms ?? new();
}

public record PublishResult(
    Guid PostId,
    bool Success,
    List<PlatformResult> PlatformResults,
    DateTime? PublishedAt = null,
    TimeSpan? Duration = null
)
{
    public List<PlatformResult> Results => PlatformResults; // Alias for compatibility
    public List<PlatformResult> PlatformResults { get; init; } = PlatformResults ?? new();
}

public record PlatformResult(
    SocialPlatform Platform,
    bool Success,
    string? PostUrl = null,
    string? PostId = null,
    string? Error = null,
    int? StatusCode = null,
    Dictionary<string, object>? Response = null
);

public record ScheduledPost(
    Guid Id,
    Guid PostId,
    Guid ProjectId,
    string PostTitle,
    string PostContent,
    List<SocialPlatform> Platforms,
    DateTime ScheduledFor,
    ScheduledPostStatus Status,
    string? JobId = null,
    int RetryCount = 0,
    DateTime? LastAttemptAt = null,
    string? LastError = null,
    string? TimeZone = null,
    DateTime? PublishedAt = null,
    DateTime CreatedAt = default
)
{
    public List<SocialPlatform> Platforms { get; init; } = Platforms ?? new();
}

public record BulkSchedule(
    List<Guid> PostIds,
    List<SocialPlatform> Platforms,
    DateTime StartTime,
    TimeSpan Interval,
    string? TimeZone = null,
    bool SkipWeekends = false,
    List<DayOfWeek>? PreferredDays = null
)
{
    public List<Guid> PostIds { get; init; } = PostIds ?? new();
    public List<SocialPlatform> Platforms { get; init; } = Platforms ?? new();
}

public record PublishingQueue(
    int PendingCount,
    int ProcessingCount,
    int FailedCount,
    DateTime? NextScheduledAt,
    List<ScheduledPost> UpcomingPosts,
    DateTime? LastProcessedAt = null
)
{
    public List<ScheduledPost> NextItems => UpcomingPosts.Take(5).ToList(); // Next 5 items
    public List<ScheduledPost> UpcomingPosts { get; init; } = UpcomingPosts ?? new();
}

public record OptimalTime(
    SocialPlatform Platform,
    DateTime SuggestedTime,
    string Reason,
    double EngagementScore,
    Dictionary<string, object>? Analytics = null
)
{
    public DateTime OptimalTimeValue => SuggestedTime; // Alias for compatibility
    public double Confidence => EngagementScore; // Alias for compatibility
    public string TimeZone => "UTC"; // Default timezone
    public int BasedOnDataPoints => Analytics?.Count ?? 0; // Derive from analytics
}

public record PublishingStats(
    int TotalPublished,
    int TotalScheduled,
    int TotalFailed,
    Dictionary<SocialPlatform, int> PublishedByPlatform,
    Dictionary<SocialPlatform, int> FailedByPlatform,
    double SuccessRate,
    DateTime? LastPublishedAt = null,
    TimeSpan AveragePublishTime = default,
    int Published = 0,
    int Pending = 0,
    int Failed = 0,
    int Cancelled = 0,
    DateRange? Period = null
)
{
    public Dictionary<SocialPlatform, int> PublishedByPlatform { get; init; } = PublishedByPlatform ?? new();
    public Dictionary<SocialPlatform, int> FailedByPlatform { get; init; } = FailedByPlatform ?? new();
}

public record RetryFailedPosts(
    List<Guid> PostIds,
    bool RetryAll = false,
    int MaxRetries = 3,
    DateTime? Since = null
)
{
    public List<Guid> PostIds { get; init; } = PostIds ?? new();
}

public record CancelScheduledPost(
    Guid ScheduledPostId,
    string? Reason = null
);

public record UpdateScheduledPost(
    Guid ScheduledPostId,
    DateTime? NewPublishTime = null,
    List<SocialPlatform>? Platforms = null,
    Dictionary<string, object>? PlatformOptions = null
)
{
    public DateTime? NewScheduledTime => NewPublishTime; // Alias for compatibility
}

// OAuth & Authentication DTOs
public record PlatformAuth(
    SocialPlatform Platform,
    string AuthorizationCode,
    string? RedirectUri = null,
    string? State = null
)
{
    public string Code => AuthorizationCode; // Alias for compatibility
}

public record PlatformToken(
    SocialPlatform Platform,
    string AccessToken,
    DateTime ExpiresAt,
    string? RefreshToken = null,
    string? TokenType = null,
    string? Scope = null
);

public record PlatformProfile(
    SocialPlatform Platform,
    string ProfileId,
    string DisplayName,
    DateTime ConnectedAt,
    string? ProfileUrl = null,
    string? ImageUrl = null,
    int? FollowerCount = null,
    bool IsVerified = false,
    Dictionary<string, object>? Metadata = null
);

// Platform-specific DTOs
public record LinkedInPost(
    string Text,
    string? ArticleUrl = null,
    string? ArticleTitle = null,
    string? ArticleDescription = null,
    List<string>? ImageUrls = null,
    string Visibility = "PUBLIC"
)
{
    public List<string>? ImageUrls { get; init; } = ImageUrls ?? new();
}

public record TwitterPost(
    string Text,
    List<string>? MediaIds = null,
    string? InReplyToStatusId = null,
    bool? AutoPopulateReplyMetadata = null,
    List<string>? PollOptions = null,
    int? PollDurationMinutes = null
)
{
    public List<string>? MediaIds { get; init; } = MediaIds ?? new();
    public List<string>? PollOptions { get; init; } = PollOptions ?? new();
}

// Utility DTOs
public record DateRange(
    DateTime From,
    DateTime To
);