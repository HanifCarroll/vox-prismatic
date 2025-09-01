using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Pipeline;

public class Pipeline
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? Status { get; set; }
    
    [MaxLength(100)]
    public string? CurrentStage { get; set; }
    
    public Dictionary<string, object>? StateData { get; set; }
    
    public Dictionary<string, object>? Config { get; set; }
    
    public Guid? TranscriptId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Transcripts.Transcript? Transcript { get; set; }
}