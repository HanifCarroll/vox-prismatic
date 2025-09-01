using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.DTOs;

public class PublishPostDto
{
    [Required]
    public string PostId { get; set; } = string.Empty;
    
    [Required]
    public List<string> Platforms { get; set; } = new();
    
    public DateTime? ScheduledTime { get; set; }
    
    public bool PublishImmediately { get; set; }
    
    public Dictionary<string, string>? PlatformSpecificContent { get; set; }
    
    public List<string>? MediaUrls { get; set; }
}

public class SchedulePostDto
{
    [Required]
    public string PostId { get; set; } = string.Empty;
    
    [Required]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    public DateTime ScheduledTime { get; set; }
    
    public string? Content { get; set; }
    
    public bool UseOptimalTime { get; set; }
    
    public Dictionary<string, object>? Metadata { get; set; }
}

public class BulkScheduleDto
{
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    
    [Required]
    public List<string> PostIds { get; set; } = new();
    
    [Required]
    public List<string> Platforms { get; set; } = new();
    
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    public bool UseOptimalTimes { get; set; } = true;
    
    public int? PostsPerDay { get; set; }
    
    public TimeSpan? MinimumInterval { get; set; }
}

public class PublishingResultDto
{
    public string PostId { get; set; } = string.Empty;
    public Dictionary<string, PlatformPublishResultDto> PlatformResults { get; set; } = new();
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class PlatformPublishResultDto
{
    public string Platform { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ExternalId { get; set; }
    public string? ExternalUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Dictionary<string, object>? Metrics { get; set; }
}

public class ScheduledPostDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ExternalPostId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int RetryCount { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateScheduledPostDto
{
    public DateTime? ScheduledTime { get; set; }
    public string? Content { get; set; }
    public string? Status { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class CancelScheduledPostDto
{
    [Required]
    public string ScheduledPostId { get; set; } = string.Empty;
    
    public string? Reason { get; set; }
}

public class ReschedulePostDto
{
    [Required]
    public string ScheduledPostId { get; set; } = string.Empty;
    
    [Required]
    public DateTime NewScheduledTime { get; set; }
    
    public bool ValidateConflicts { get; set; } = true;
}

public class PublishingQueueStatusDto
{
    public int TotalPending { get; set; }
    public int ActivePublishing { get; set; }
    public int Failed { get; set; }
    public int Published { get; set; }
    public Dictionary<string, int> PlatformCounts { get; set; } = new();
    public List<QueueItemDto> QueueItems { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

public class QueueItemDto
{
    public string Id { get; set; } = string.Empty;
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public DateTime QueuedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Priority { get; set; }
}

public class OptimalScheduleRequestDto
{
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    
    [Required]
    [Range(1, 100)]
    public int NumberOfPosts { get; set; }
    
    [Required]
    public List<string> Platforms { get; set; } = new();
    
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    public bool AvoidWeekends { get; set; }
    
    public List<int>? PreferredHours { get; set; }
    
    public string TimeZone { get; set; } = "UTC";
}

public class OptimalScheduleResponseDto
{
    public string ProjectId { get; set; } = string.Empty;
    public List<ScheduleSlotDto> Schedule { get; set; } = new();
    public Dictionary<string, List<TimeSlotDto>> AvailableSlots { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
}

public class ScheduleSlotDto
{
    public DateTime Time { get; set; }
    public string Platform { get; set; } = string.Empty;
    public double EngagementScore { get; set; }
    public bool IsOptimal { get; set; }
    public string? PostId { get; set; }
}

public class TimeSlotDto
{
    public DateTime Time { get; set; }
    public string Platform { get; set; } = string.Empty;
    public double EngagementScore { get; set; }
    public bool IsAvailable { get; set; }
    public string? ConflictReason { get; set; }
}

public class PublishingAnalyticsDto
{
    public string ProjectId { get; set; } = string.Empty;
    public DateRange Period { get; set; } = new();
    public int TotalPublished { get; set; }
    public int TotalScheduled { get; set; }
    public int TotalFailed { get; set; }
    public Dictionary<string, PlatformAnalyticsDto> PlatformAnalytics { get; set; } = new();
    public List<TimePerformanceDto> BestPerformingTimes { get; set; } = new();
    public Dictionary<int, double> EngagementByHour { get; set; } = new();
    public Dictionary<DayOfWeek, double> EngagementByDay { get; set; } = new();
}

public class PlatformAnalyticsDto
{
    public string Platform { get; set; } = string.Empty;
    public int PostsPublished { get; set; }
    public int PostsScheduled { get; set; }
    public int PostsFailed { get; set; }
    public double AverageEngagement { get; set; }
    public double SuccessRate { get; set; }
    public DateTime? LastPublished { get; set; }
    public Dictionary<string, object>? Metrics { get; set; }
}

public class TimePerformanceDto
{
    public DateTime Time { get; set; }
    public string Platform { get; set; } = string.Empty;
    public double EngagementScore { get; set; }
    public int PostCount { get; set; }
}

public class DateRange
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
}

public class PublishingHealthCheckDto
{
    public Dictionary<string, PlatformHealthDto> Platforms { get; set; } = new();
    public QueueHealthDto QueueHealth { get; set; } = new();
    public DateTime CheckedAt { get; set; }
    public bool IsHealthy { get; set; }
    public List<string> Issues { get; set; } = new();
}

public class PlatformHealthDto
{
    public string Platform { get; set; } = string.Empty;
    public bool IsAuthenticated { get; set; }
    public bool IsRateLimited { get; set; }
    public int RemainingApiCalls { get; set; }
    public DateTime? RateLimitResetTime { get; set; }
    public DateTime LastChecked { get; set; }
    public string? Error { get; set; }
}

public class QueueHealthDto
{
    public int PendingJobs { get; set; }
    public int ProcessingJobs { get; set; }
    public int FailedJobs { get; set; }
    public int StuckJobs { get; set; }
    public double ProcessingRate { get; set; }
    public TimeSpan AverageProcessingTime { get; set; }
    public DateTime OldestJobTime { get; set; }
}