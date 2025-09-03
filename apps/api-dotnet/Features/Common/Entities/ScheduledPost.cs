using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class ScheduledPost
{
    [Key]
    public Guid Id { get; private set; }
    
    [Required]
    public Guid PostId { get; private set; }
    public virtual Post Post { get; private set; } = null!;
    
    [Required]
    public Guid ProjectId { get; private set; }
    public virtual ContentProject Project { get; private set; } = null!;
    
    [Required]
    public SocialPlatform Platform { get; private set; }
    
    [Required]
    public string Content { get; private set; }
    
    public DateTime ScheduledTime { get; private set; }
    
    public ScheduledPostStatus Status { get; private set; }
    
    public int RetryCount { get; private set; }
    
    public DateTime? LastAttempt { get; private set; }
    
    public string? ErrorMessage { get; private set; }

    public string? FailureReason { get; private set; }

    public DateTime? ScheduledFor { get; private set; }
    
    public DateTime? PublishedAt { get; private set; }
    
    public string? PublishUrl { get; private set; }
    
    public string? HangfireJobId { get; private set; }
    
    [MaxLength(100)]
    public string? ExternalPostId { get; private set; }
    
    public string? JobId { get; private set; }

    public string? PublishResultJson { get; private set; }
    
    public List<SocialPlatform> Platforms { get; private set; }
    
    public DateTime? CancelledAt { get; private set; }
    
    public string? CancelReason { get; private set; }
    
    public string? TimeZone { get; private set; }
    
    public DateTime CreatedAt { get; private set; }
    
    public DateTime UpdatedAt { get; private set; }
    
    // Private constructor for EF Core
    private ScheduledPost()
    {
        Id = Guid.NewGuid();
        Platform = SocialPlatform.LinkedIn;
        Content = string.Empty;
        Status = ScheduledPostStatus.Pending;
        RetryCount = 0;
        Platforms = new List<SocialPlatform>();
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    // Private constructor for factory method
    private ScheduledPost(
        Guid projectId,
        Guid postId,
        SocialPlatform platform,
        string content,
        DateTime scheduledFor,
        string? timeZone = null) : this()
    {
        ProjectId = projectId;
        PostId = postId;
        Platform = platform;
        Content = content;
        ScheduledFor = scheduledFor;
        ScheduledTime = scheduledFor;
        TimeZone = timeZone ?? "UTC";
    }
    
    // Factory method for creating new scheduled posts
    public static ScheduledPost Create(
        Guid projectId,
        Guid postId,
        SocialPlatform platform,
        string content,
        DateTime scheduledFor,
        string? timeZone = null)
    {
        if (projectId == Guid.Empty)
            throw new ArgumentException("Project ID is required", nameof(projectId));
        
        if (postId == Guid.Empty)
            throw new ArgumentException("Post ID is required", nameof(postId));
        
        // Platform is an enum, so it's always valid
        
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Content is required", nameof(content));
        
        if (scheduledFor < DateTime.UtcNow)
            throw new ArgumentException("Scheduled time must be in the future", nameof(scheduledFor));
        
        return new ScheduledPost(projectId, postId, platform, content, scheduledFor, timeZone);
    }
    
    // Domain methods
    public void StartProcessing()
    {
        if (Status != ScheduledPostStatus.Pending)
            throw new InvalidOperationException($"Can only start processing posts in Pending status, current status is {Status}");
        
        Status = ScheduledPostStatus.Processing;
        LastAttempt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsPublished(string? externalPostId, DateTime? publishedAt = null)
    {
        Status = ScheduledPostStatus.Published;
        PublishedAt = publishedAt ?? DateTime.UtcNow;
        ExternalPostId = externalPostId;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsPublished(string publishUrl, string? externalPostId = null, string? publishResultJson = null)
    {
        if (Status != ScheduledPostStatus.Processing)
            throw new InvalidOperationException($"Can only mark as published from Processing status, current status is {Status}");
        
        Status = ScheduledPostStatus.Published;
        PublishedAt = DateTime.UtcNow;
        PublishUrl = publishUrl;
        ExternalPostId = externalPostId;
        PublishResultJson = publishResultJson;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorMessage, string? failureReason = null)
    {
        Status = ScheduledPostStatus.Failed;
        ErrorMessage = errorMessage;
        FailureReason = failureReason ?? errorMessage;
        LastAttempt = DateTime.UtcNow;
        RetryCount++;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Cancel(string cancelReason)
    {
        if (Status == ScheduledPostStatus.Published)
            throw new InvalidOperationException("Cannot cancel a published post");
        
        Status = ScheduledPostStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancelReason = cancelReason;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Reschedule(DateTime newScheduledTime)
    {
        if (Status == ScheduledPostStatus.Published)
            throw new InvalidOperationException("Cannot reschedule a published post");
        
        if (newScheduledTime < DateTime.UtcNow)
            throw new ArgumentException("Scheduled time must be in the future", nameof(newScheduledTime));
        
        ScheduledFor = newScheduledTime;
        ScheduledTime = newScheduledTime;
        Status = ScheduledPostStatus.Pending;
        RetryCount = 0;
        ErrorMessage = null;
        FailureReason = null;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetHangfireJobId(string jobId)
    {
        HangfireJobId = jobId;
        JobId = jobId;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public bool CanRetry(int maxRetries = 3)
    {
        return Status == ScheduledPostStatus.Failed && RetryCount < maxRetries;
    }
    
    public void ResetForRetry()
    {
        if (!CanRetry())
            throw new InvalidOperationException("Cannot retry this scheduled post");
        
        Status = ScheduledPostStatus.Pending;
        ErrorMessage = null;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void IncrementRetryCount()
    {
        RetryCount++;
        LastAttempt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateStatus(ScheduledPostStatus status)
    {
        Status = status;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetError(string errorMessage)
    {
        ErrorMessage = errorMessage;
        UpdatedAt = DateTime.UtcNow;
    }
}