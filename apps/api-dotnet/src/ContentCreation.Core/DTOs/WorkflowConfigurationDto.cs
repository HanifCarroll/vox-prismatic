namespace ContentCreation.Core.DTOs;

/// <summary>
/// DTO for workflow configuration settings.
/// </summary>
public class WorkflowConfigurationDto
{
    // Auto approval settings
    public bool AutoApproveInsights { get; set; } = false;
    public int MinInsightScore { get; set; } = 70;
    public bool AutoGeneratePosts { get; set; } = false;
    public bool AutoSchedulePosts { get; set; } = false;
    
    // Processing preferences
    public bool SkipHumanReview { get; set; } = false;
    public bool EnableContentFiltering { get; set; } = true;
    public int MaxInsightsPerSession { get; set; } = 10;
    public int MaxPostsPerInsight { get; set; } = 3;
    
    // Publishing configuration
    public List<string> PreferredPlatforms { get; set; } = new() { "linkedin" };
    public int PostSchedulingIntervalHours { get; set; } = 4;
    public bool UseOptimalTimingPrediction { get; set; } = true;
    
    // Quality gates
    public bool RequireManualApprovalForHighRisk { get; set; } = true;
    public int QualityScoreThreshold { get; set; } = 80;
    public bool EnableAIContentModerationCheck { get; set; } = true;
    
    // Notification settings
    public bool NotifyOnStageCompletion { get; set; } = true;
    public bool NotifyOnErrors { get; set; } = true;
    public bool NotifyOnScheduledPublish { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}