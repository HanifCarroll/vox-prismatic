namespace ContentCreation.Core.Enums;

public static class ProjectEventType
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