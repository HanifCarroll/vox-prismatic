using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class Post
{
    [Key]
    public Guid Id { get; private set; }
    
    [Required]
    public Guid ProjectId { get; private set; }
    public virtual ContentProject Project { get; private set; } = null!;
    public virtual ContentProject ContentProject => Project;
    
    [Required]
    public Guid InsightId { get; private set; }
    public virtual Insight Insight { get; private set; } = null!;
    
    [Required]
    [MaxLength(500)]
    public string Title { get; private set; }
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; private set; }
    
    [Required]
    public string Content { get; private set; }
    
    public string? Hashtags { get; private set; }
    
    public string? MediaUrls { get; private set; }
    
    public int Priority { get; private set; }
    
    public PostStatus Status { get; private set; }
    
    public int? CharacterCount { get; private set; }
    
    public string? ErrorMessage { get; private set; }
    
    public DateTime? RejectedAt { get; private set; }
    public string? RejectedBy { get; private set; }
    public string? RejectedReason { get; private set; }
    
    public DateTime? ApprovedAt { get; private set; }
    public string? ApprovedBy { get; private set; }
    
    public DateTime? ReviewedAt { get; private set; }
    public string? ReviewedBy { get; private set; }
    
    public DateTime? ArchivedAt { get; private set; }
    public string? ArchivedReason { get; private set; }
    
    public DateTime? FailedAt { get; private set; }
    
    public DateTime? PublishedAt { get; private set; }
    
    public Dictionary<string, object>? Metadata { get; private set; }
    
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    
    public bool IsApproved => Status == PostStatus.Approved || ApprovedAt.HasValue;
    public bool IsReviewed => Status == PostStatus.Approved || Status == PostStatus.Rejected;
    
    public virtual ICollection<ScheduledPost> ScheduledPosts { get; private set; } = new List<ScheduledPost>();
    
    // Private constructor for EF Core
    private Post()
    {
        Id = Guid.NewGuid();
        Title = string.Empty;
        Platform = string.Empty;
        Content = string.Empty;
        Priority = 0;
        Status = PostStatus.Draft;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        ScheduledPosts = new List<ScheduledPost>();
    }
    
    // Private constructor for factory method
    private Post(
        Guid projectId,
        Guid insightId,
        string title,
        string platform,
        string content,
        string? hashtags = null,
        int priority = 0) : this()
    {
        ProjectId = projectId;
        InsightId = insightId;
        Title = title;
        Platform = platform;
        Content = content;
        Hashtags = hashtags;
        Priority = priority;
        CharacterCount = content.Length;
    }
    
    // Factory method for creating new posts
    public static Post Create(
        Guid projectId,
        Guid insightId,
        string title,
        string platform,
        string content,
        string? hashtags = null,
        int priority = 0)
    {
        if (projectId == Guid.Empty)
            throw new ArgumentException("Project ID is required", nameof(projectId));
        
        if (insightId == Guid.Empty)
            throw new ArgumentException("Insight ID is required", nameof(insightId));
        
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required", nameof(title));
        
        if (title.Length > 500)
            throw new ArgumentException("Title must not exceed 500 characters", nameof(title));
        
        if (string.IsNullOrWhiteSpace(platform))
            throw new ArgumentException("Platform is required", nameof(platform));
        
        if (platform.Length > 50)
            throw new ArgumentException("Platform must not exceed 50 characters", nameof(platform));
        
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Content is required", nameof(content));
        
        return new Post(projectId, insightId, title, platform, content, hashtags, priority);
    }
    
    // Domain methods
    public void Approve(string approvedBy)
    {
        if (IsApproved)
            throw new InvalidOperationException($"Post {Id} is already approved");
        
        Status = PostStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;
        ReviewedAt = DateTime.UtcNow;
        ReviewedBy = approvedBy;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Reject(string rejectedBy, string reason)
    {
        if (Status == PostStatus.Rejected)
            throw new InvalidOperationException($"Post {Id} is already rejected");
        
        Status = PostStatus.Rejected;
        RejectedBy = rejectedBy;
        RejectedAt = DateTime.UtcNow;
        RejectedReason = reason;
        ReviewedAt = DateTime.UtcNow;
        ReviewedBy = rejectedBy;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Archive(string reason)
    {
        ArchivedAt = DateTime.UtcNow;
        ArchivedReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsScheduled()
    {
        if (!IsApproved)
            throw new InvalidOperationException($"Post {Id} must be approved before scheduling");
        
        Status = PostStatus.Scheduled;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsPublished()
    {
        Status = PostStatus.Published;
        PublishedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorMessage)
    {
        Status = PostStatus.Failed;
        FailedAt = DateTime.UtcNow;
        ErrorMessage = errorMessage;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateCharacterCount()
    {
        CharacterCount = Content?.Length ?? 0;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateContent(string content, string? hashtags = null)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Content cannot be empty", nameof(content));
        
        Content = content;
        Hashtags = hashtags;
        CharacterCount = content.Length;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetPriority(int priority)
    {
        Priority = priority;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetMediaUrls(string? mediaUrls)
    {
        MediaUrls = mediaUrls;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetMetadata(Dictionary<string, object>? metadata)
    {
        Metadata = metadata;
        UpdatedAt = DateTime.UtcNow;
    }
}