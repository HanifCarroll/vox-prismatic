using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Projects;

namespace ContentCreation.Api.Features.Transcripts;

public class Transcript
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string RawContent { get; set; } = string.Empty;
    
    public string? CleanedContent { get; set; }
    
    [MaxLength(50)]
    public string Status { get; set; } = "raw";
    
    [MaxLength(50)]
    public string? SourceType { get; set; }
    
    [MaxLength(500)]
    public string? SourceUrl { get; set; }
    
    [MaxLength(255)]
    public string? FileName { get; set; }
    
    public int? Duration { get; set; }
    
    public int WordCount { get; set; } = 0;
    
    [MaxLength(500)]
    public string? FilePath { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    public DateTime? FailedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}