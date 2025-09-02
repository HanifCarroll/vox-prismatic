using ContentCreation.Core.Enums;

namespace ContentCreation.Core.DTOs.Publishing;

// Utility DTOs
public class DateRangeDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
}

// OAuth & Authentication DTOs
public class PlatformAuthDto
{
    public string Platform { get; set; } = string.Empty;
    public string AuthorizationCode { get; set; } = string.Empty;
    public string Code => AuthorizationCode; // Alias for compatibility
    public string? RedirectUri { get; set; }
    public string? State { get; set; }
}

public class PlatformTokenDto
{
    public string Platform { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string? TokenType { get; set; }
    public string? Scope { get; set; }
}

public class PlatformProfileDto
{
    public string Platform { get; set; } = string.Empty;
    public string ProfileId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? ProfileUrl { get; set; }
    public string? ImageUrl { get; set; }
    public int? FollowerCount { get; set; }
    public bool IsVerified { get; set; }
    public DateTime ConnectedAt { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

// Publishing DTOs
public class PublishNowDto
{
    public Guid PostId { get; set; }
    public List<string> Platforms { get; set; } = new();
    public bool IgnoreSchedule { get; set; } = false;
    public Dictionary<string, object>? PlatformOptions { get; set; }
}

public class SchedulePostDto
{
    public Guid PostId { get; set; }
    public DateTime PublishAt { get; set; }
    public DateTime ScheduledTime => PublishAt; // Alias for compatibility
    public List<string> Platforms { get; set; } = new();
    public string? TimeZone { get; set; }
    public bool OptimizeTime { get; set; } = false;
    public Dictionary<string, object>? PlatformOptions { get; set; }
}

public class PublishResultDto
{
    public Guid PostId { get; set; }
    public bool Success { get; set; }
    public List<PlatformResultDto> PlatformResults { get; set; } = new();
    public List<PlatformResultDto> Results => PlatformResults; // Alias for compatibility
    public DateTime? PublishedAt { get; set; }
    public TimeSpan? Duration { get; set; }
}

public class PlatformResultDto
{
    public string Platform { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? PostUrl { get; set; }
    public string? PostId { get; set; }
    public string? Error { get; set; }
    public int? StatusCode { get; set; }
    public Dictionary<string, object>? Response { get; set; }
}

public class ScheduledPostDto
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid ProjectId { get; set; }
    public string PostTitle { get; set; } = string.Empty;
    public string PostContent { get; set; } = string.Empty;
    public List<string> Platforms { get; set; } = new();
    public DateTime ScheduledFor { get; set; }
    public string Status { get; set; } = "pending";
    public string? JobId { get; set; }
    public int RetryCount { get; set; }
    public DateTime? LastAttemptAt { get; set; }
    public string? LastError { get; set; }
    public string? TimeZone { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BulkScheduleDto
{
    public List<Guid> PostIds { get; set; } = new();
    public List<string> Platforms { get; set; } = new();
    public DateTime StartTime { get; set; }
    public TimeSpan Interval { get; set; }
    public string? TimeZone { get; set; }
    public bool SkipWeekends { get; set; } = false;
    public List<DayOfWeek>? PreferredDays { get; set; }
}

public class PublishingQueueDto
{
    public int PendingCount { get; set; }
    public int ProcessingCount { get; set; }
    public int FailedCount { get; set; }
    public DateTime? NextScheduledAt { get; set; }
    public List<ScheduledPostDto> UpcomingPosts { get; set; } = new();
    public List<ScheduledPostDto> NextItems => UpcomingPosts.Take(5).ToList(); // Next 5 items
    public DateTime? LastProcessedAt { get; set; }
}

public class OptimalTimeDto
{
    public string Platform { get; set; } = string.Empty;
    public DateTime SuggestedTime { get; set; }
    public DateTime OptimalTime => SuggestedTime; // Alias for compatibility
    public string Reason { get; set; } = string.Empty;
    public double EngagementScore { get; set; }
    public double Confidence => EngagementScore; // Alias for compatibility
    public Dictionary<string, object>? Analytics { get; set; }
    public string TimeZone => "UTC"; // Default timezone
    public int BasedOnDataPoints => Analytics?.Count ?? 0; // Derive from analytics
}

public class PublishingStatsDto
{
    public int TotalPublished { get; set; }
    public int TotalScheduled { get; set; }
    public int TotalFailed { get; set; }
    public Dictionary<string, int> PublishedByPlatform { get; set; } = new();
    public Dictionary<string, int> FailedByPlatform { get; set; } = new();
    public double SuccessRate { get; set; }
    public DateTime? LastPublishedAt { get; set; }
    public TimeSpan AveragePublishTime { get; set; }
    public int Published { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
    public int Cancelled { get; set; }
    public DateRangeDto? Period { get; set; }
}

public class RetryFailedPostsDto
{
    public List<Guid> PostIds { get; set; } = new();
    public bool RetryAll { get; set; } = false;
    public int? MaxRetries { get; set; } = 3;
    public DateTime? Since { get; set; }
}

public class CancelScheduledPostDto
{
    public Guid ScheduledPostId { get; set; }
    public string? Reason { get; set; }
}

public class UpdateScheduledPostDto
{
    public Guid ScheduledPostId { get; set; }
    public DateTime? NewPublishTime { get; set; }
    public DateTime? NewScheduledTime => NewPublishTime; // Alias for compatibility
    public List<string>? Platforms { get; set; }
    public Dictionary<string, object>? PlatformOptions { get; set; }
}

// Platform-specific DTOs
public class LinkedInPostDto
{
    public string Text { get; set; } = string.Empty;
    public string? ArticleUrl { get; set; }
    public string? ArticleTitle { get; set; }
    public string? ArticleDescription { get; set; }
    public List<string>? ImageUrls { get; set; }
    public string Visibility { get; set; } = "PUBLIC";
}

public class TwitterPostDto
{
    public string Text { get; set; } = string.Empty;
    public List<string>? MediaIds { get; set; }
    public string? InReplyToStatusId { get; set; }
    public bool? AutoPopulateReplyMetadata { get; set; }
    public List<string>? PollOptions { get; set; }
    public int? PollDurationMinutes { get; set; }
}