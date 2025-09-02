namespace ContentCreation.Core.Entities;

/// <summary>
/// Tracks comprehensive metrics and analytics for content project performance.
/// </summary>
public class ProjectMetrics
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
    public int TotalPosts { get; set; }
    public int PostsApproved { get; set; }
    public int PostsScheduled { get; set; }
    public int PostsPublished { get; set; }
    public int PublishedPosts { get; set; }
    public int PostsFailed { get; set; }
    public int PostCount { get; set; }
    public int PublishedPostCount { get; set; }
    
    // Processing timestamps
    public DateTime? LastInsightExtractionAt { get; set; }
    public DateTime? LastPostGenerationAt { get; set; }
    public DateTime? LastPublishedAt { get; set; }
    public DateTime? LastUpdated { get; set; }
    
    // Additional computed metrics
    public double? SuccessRate => PostsTotal > 0 
        ? (double)PostsPublished / PostsTotal * 100 
        : null;
        
    public double? ApprovalRate => InsightsTotal > 0 
        ? (double)InsightsApproved / InsightsTotal * 100 
        : null;
}