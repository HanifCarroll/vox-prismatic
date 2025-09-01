using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Projects;

public class ProjectEvent
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; }
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? EventName { get; set; }
    
    public string? Description { get; set; }
    
    public string? UserId { get; set; }
    
    public object? EventData { get; set; }
    
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}

public static class ProjectEventTypes
{
    public const string StageChanged = "stage_changed";
    public const string TranscriptUploaded = "transcript_uploaded";
    public const string TranscriptProcessed = "transcript_processed";
    public const string InsightsGenerated = "insights_generated";
    public const string InsightsReviewed = "insights_reviewed";
    public const string PostsGenerated = "posts_generated";
    public const string PostsReviewed = "posts_reviewed";
    public const string PostsScheduled = "posts_scheduled";
    public const string PostPublished = "post_published";
    public const string ProcessingError = "processing_error";
    public const string UserAction = "user_action";
    public const string AutomationTriggered = "automation_triggered";
}