using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class ProjectProcessingJob
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ProjectId { get; set; }
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    public ProcessingJobType JobType { get; set; }
    
    [Required]
    public ProcessingJobStatus Status { get; set; } = ProcessingJobStatus.Queued;
    
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