using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Jobs;

public class ProcessingJob
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Type { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;
    
    public int Progress { get; set; }
    
    public Dictionary<string, object>? Data { get; set; }
    
    public Dictionary<string, object>? Result { get; set; }
    
    public string? Error { get; set; }
    
    public DateTime? StartedAt { get; set; }
    
    public DateTime? CompletedAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
}