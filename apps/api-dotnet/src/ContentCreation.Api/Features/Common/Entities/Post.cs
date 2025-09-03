using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class Post
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ProjectId { get; set; }
    public virtual ContentProject Project { get; set; } = null!;
    public virtual ContentProject ContentProject => Project;
    
    [Required]
    public Guid InsightId { get; set; }
    public virtual Insight Insight { get; set; } = null!;
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public string? Hashtags { get; set; }
    
    public string? MediaUrls { get; set; }
    
    public int Priority { get; set; } = 0;
    
    public PostStatus Status { get; set; } = PostStatus.Draft;
    
    public int? CharacterCount { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    public DateTime? RejectedAt { get; set; }
    public string? RejectedBy { get; set; }
    public string? RejectedReason { get; set; }
    
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedBy { get; set; }
    
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedReason { get; set; }
    
    public DateTime? FailedAt { get; set; }
    
    public DateTime? PublishedAt { get; set; }
    
    public Dictionary<string, object>? Metadata { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsApproved => Status == PostStatus.Approved || ApprovedAt.HasValue;
    public bool IsReviewed => Status == PostStatus.Approved || Status == PostStatus.Rejected;
    
    public virtual ICollection<ProjectScheduledPost> ScheduledPosts { get; set; } = new List<ProjectScheduledPost>();
    
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
    }
}