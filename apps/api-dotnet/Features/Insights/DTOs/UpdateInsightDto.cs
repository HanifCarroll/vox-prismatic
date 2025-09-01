using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Insights.DTOs;

public class UpdateInsightDto
{
    public string? Title { get; set; }
    
    public string? Content { get; set; }
    
    public string? Category { get; set; }
    
    public string? PostType { get; set; }
    
    public string? Status { get; set; }
    
    public int? ImpactScore { get; set; }
    
    public int? ConfidenceScore { get; set; }
    
    public int? ActionabilityScore { get; set; }
    
    public bool? IsApproved { get; set; }
    
    public string? ReviewNotes { get; set; }
    
    public List<string>? Tags { get; set; }
    
    public List<string>? Quotes { get; set; }
    
    public List<string>? TalkingPoints { get; set; }
}

public class CreateInsightDto
{
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public string Category { get; set; } = string.Empty;
    
    [Required]
    public string PostType { get; set; } = string.Empty;
    
    public string? ProjectId { get; set; }
    
    public int ImpactScore { get; set; } = 5;
    
    public int ConfidenceScore { get; set; } = 5;
    
    public int ActionabilityScore { get; set; } = 5;
    
    public List<string> Tags { get; set; } = new();
    
    public List<string> Quotes { get; set; } = new();
    
    public List<string> TalkingPoints { get; set; } = new();
}

public class InsightFilterDto
{
    public string? ProjectId { get; set; }
    public string? Status { get; set; }
    public string? Category { get; set; }
    public bool? IsApproved { get; set; }
    public int? MinScore { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; } = true;
}

public class BulkUpdateInsightsDto
{
    [Required]
    public List<string> InsightIds { get; set; } = new();
    
    public string? Status { get; set; }
    
    public bool? IsApproved { get; set; }
    
    public string? ReviewNotes { get; set; }
}