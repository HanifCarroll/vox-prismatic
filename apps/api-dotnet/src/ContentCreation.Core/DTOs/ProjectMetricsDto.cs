namespace ContentCreation.Core.DTOs;

/// <summary>
/// Comprehensive metrics DTO for content project analytics and reporting.
/// </summary>
public class ProjectMetricsDto
{
    // Transcript metrics
    public int TranscriptWordCount { get; set; }
    
    // Insight metrics
    public int InsightsTotal { get; set; }
    public int InsightsApproved { get; set; }
    public int InsightsRejected { get; set; }
    public int InsightCount { get; set; }
    
    // Post metrics
    public int PostsTotal { get; set; }
    public int PostsApproved { get; set; }
    public int PostsScheduled { get; set; }
    public int PostsPublished { get; set; }
    public int PostsFailed { get; set; }
    public int PostCount { get; set; }
    public int PublishedPostCount { get; set; }
    
    // Processing timestamps
    public DateTime? LastInsightExtractionAt { get; set; }
    public DateTime? LastPostGenerationAt { get; set; }
    public DateTime? LastPublishedAt { get; set; }
    
    // Computed analytics
    public double? SuccessRate { get; set; }
    public double? ApprovalRate { get; set; }
    public double CompletionPercentage { get; set; }
    public DateTime? LastActivityDate { get; set; }
    public TimeSpan? AverageProcessingTime { get; set; }
    
    // Breakdown analytics
    public Dictionary<string, int> PlatformBreakdown { get; set; } = new();
    public Dictionary<string, int> CategoryBreakdown { get; set; } = new();
}