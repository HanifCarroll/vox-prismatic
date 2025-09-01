using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Posts;

public class Post
{
    public Guid Id { get; set; }
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? Status { get; set; }
    
    public bool IsReviewed { get; set; }
    
    public Guid? InsightId { get; set; }
    
    public string? PublishedUrl { get; set; }
    
    public DateTime? PublishedAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Insights.Insight? Insight { get; set; }
    public ICollection<ScheduledPost> ScheduledPosts { get; set; } = new List<ScheduledPost>();
}

public class ScheduledPost
{
    public Guid Id { get; set; }
    
    public Guid PostId { get; set; }
    
    [Required]
    public DateTime ScheduledFor { get; set; }
    
    [MaxLength(50)]
    public string? Status { get; set; }
    
    public DateTime? PublishedAt { get; set; }
    
    public string? Error { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    public Post Post { get; set; } = null!;
}