namespace ContentCreation.Core.Enums;

public enum PipelineStage
{
    Idle,
    TranscriptReceived,
    CleaningTranscript,
    ExtractingInsights,
    InsightsReview,
    GeneratingPosts,
    PostsReview,
    Scheduling,
    Completed,
    Failed,
    Cancelled
}

public enum PipelineStatus
{
    NotStarted,
    InProgress,
    WaitingForReview,
    Completed,
    Failed,
    Cancelled
}

public enum ReviewDecision
{
    Approved,
    Rejected,
    RequestChanges
}