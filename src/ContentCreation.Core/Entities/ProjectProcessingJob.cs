using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class ProjectProcessingJob
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string JobType { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string Status { get; set; } = "queued";
    
    public int Progress { get; set; } = 0;
    
    public int ResultCount { get; set; } = 0;
    
    public string? ErrorMessage { get; set; }
    
    public DateTime? StartedAt { get; set; }
    
    public DateTime? CompletedAt { get; set; }
    
    public int? DurationMs { get; set; }
    
    public int? EstimatedTokens { get; set; }
    
    public float? EstimatedCost { get; set; }
    
    public int RetryCount { get; set; } = 0;
    
    public int MaxRetries { get; set; } = 3;
    
    public object? LastError { get; set; }
    
    public object? Metadata { get; set; }
    
    public string? HangfireJobId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}