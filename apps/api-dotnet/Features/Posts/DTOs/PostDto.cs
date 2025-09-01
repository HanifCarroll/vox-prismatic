using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Posts.DTOs;

public class PostDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string InsightId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int CharacterCount { get; set; }
    public int WordCount { get; set; }
    public bool IsApproved { get; set; }
    public string? ReviewNotes { get; set; }
    public List<string> Hashtags { get; set; } = new();
    public List<string> Mentions { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? PublishedUrl { get; set; }
    public PostEngagementMetrics? EngagementMetrics { get; set; }
}

public class PostEngagementMetrics
{
    public int Views { get; set; }
    public int Likes { get; set; }
    public int Comments { get; set; }
    public int Shares { get; set; }
    public int Clicks { get; set; }
    public float EngagementRate { get; set; }
    public DateTime? LastUpdated { get; set; }
}

public class CreatePostDto
{
    [Required]
    public string InsightId { get; set; } = string.Empty;
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public string Platform { get; set; } = string.Empty;
    
    public List<string> Hashtags { get; set; } = new();
    
    public List<string> Mentions { get; set; } = new();
    
    public Dictionary<string, object>? Metadata { get; set; }
}

public class UpdatePostDto
{
    public string? Title { get; set; }
    
    public string? Content { get; set; }
    
    public string? Status { get; set; }
    
    public bool? IsApproved { get; set; }
    
    public string? ReviewNotes { get; set; }
    
    public List<string>? Hashtags { get; set; }
    
    public List<string>? Mentions { get; set; }
    
    public Dictionary<string, object>? Metadata { get; set; }
}

public class PostFilterDto
{
    public string? ProjectId { get; set; }
    public string? InsightId { get; set; }
    public string? Platform { get; set; }
    public string? Status { get; set; }
    public bool? IsApproved { get; set; }
    public DateTime? PublishedAfter { get; set; }
    public DateTime? PublishedBefore { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; } = true;
}

public class BulkUpdatePostsDto
{
    [Required]
    public List<string> PostIds { get; set; } = new();
    
    public string? Status { get; set; }
    
    public bool? IsApproved { get; set; }
    
    public string? ReviewNotes { get; set; }
}

public class SchedulePostDto
{
    [Required]
    public string PostId { get; set; } = string.Empty;
    
    [Required]
    public DateTime ScheduledTime { get; set; }
    
    public string? TimeZone { get; set; } = "UTC";
}

public class PostPerformanceDto
{
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public PostEngagementMetrics Metrics { get; set; } = new();
    public Dictionary<string, float> DailyEngagement { get; set; } = new();
    public List<string> TopComments { get; set; } = new();
}