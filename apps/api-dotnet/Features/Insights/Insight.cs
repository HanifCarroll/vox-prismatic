using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Insights;

public class Insight
{
    public Guid Id { get; set; }
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Category { get; set; }
    
    public bool IsReviewed { get; set; }
    
    public Guid TranscriptId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Transcripts.Transcript Transcript { get; set; } = null!;
    public ICollection<Posts.Post> Posts { get; set; } = new List<Posts.Post>();
}