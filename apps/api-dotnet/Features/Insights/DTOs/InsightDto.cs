namespace ContentCreation.Api.Features.Insights.DTOs;

public class InsightDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Category { get; set; }
    public bool IsReviewed { get; set; }
    public Guid TranscriptId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateInsightDto
{
    public string Content { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid TranscriptId { get; set; }
    public bool IsReviewed { get; set; } = false;
}

public class UpdateInsightDto
{
    public string? Content { get; set; }
    public string? Category { get; set; }
    public bool? IsReviewed { get; set; }
}