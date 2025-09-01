using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Transcripts;

public class Transcript
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Source { get; set; }
    
    public int? Duration { get; set; }
    
    public string? AudioFileUrl { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public ICollection<Insights.Insight> Insights { get; set; } = new List<Insights.Insight>();
    public ICollection<Pipeline.Pipeline> Pipelines { get; set; } = new List<Pipeline.Pipeline>();
}