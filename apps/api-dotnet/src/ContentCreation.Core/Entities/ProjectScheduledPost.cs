using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class ProjectScheduledPost
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    public string PostId { get; set; } = string.Empty;
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
    
    public string? ExternalPostId { get; set; }
    
    public string? HangfireJobId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}