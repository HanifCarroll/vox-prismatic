using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class ProjectScheduledPost
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ProjectId { get; set; }
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    public Guid PostId { get; set; }
    public virtual Post Post { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public DateTime ScheduledTime { get; set; }
    
    [MaxLength(50)]
    public string Status { get; set; } = "pending";
    
    public int RetryCount { get; set; } = 0;
    
    public DateTime? LastAttempt { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    public DateTime? PublishedAt { get; set; }
    
    public string? PublishUrl { get; set; }
    
    public string? HangfireJobId { get; set; }
    
    [MaxLength(100)]
    public string? ExternalPostId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}