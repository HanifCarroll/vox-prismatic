using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

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
    
    [MaxLength(50)]
    public string Status { get; set; } = "draft";
    
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
    
    public bool IsApproved => Status == "approved" || ApprovedAt.HasValue;
    
    public virtual ICollection<ProjectScheduledPost> ScheduledPosts { get; set; } = new List<ProjectScheduledPost>();
}