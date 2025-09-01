using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Projects;

namespace ContentCreation.Api.Features.Insights;

public class Insight
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    public string TranscriptId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Summary { get; set; } = string.Empty;
    
    [Required]
    public string VerbatimQuote { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string PostType { get; set; } = string.Empty;
    
    public int UrgencyScore { get; set; } = 0;
    public int RelatabilityScore { get; set; } = 0;
    public int SpecificityScore { get; set; } = 0;
    public int AuthorityScore { get; set; } = 0;
    public int TotalScore { get; set; } = 0;
    
    [MaxLength(50)]
    public string Status { get; set; } = "draft";
    
    public int? ProcessingDurationMs { get; set; }
    public int? EstimatedTokens { get; set; }
    public float? EstimatedCost { get; set; }
    
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    
    public string? ArchivedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedReason { get; set; }
    
    public string? FailureReason { get; set; }
    public DateTime? FailedAt { get; set; }
    public int RetryCount { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public virtual ICollection<Posts.Post> Posts { get; set; } = new List<Posts.Post>();
}