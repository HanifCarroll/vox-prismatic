namespace ContentCreation.Api.Features.Common.Enums;

// Project lifecycle stages
public enum ProjectStage
{
    RawContent,
    ProcessingContent,
    InsightsReady,
    InsightsApproved,
    PostsGenerated,
    PostsApproved,
    Scheduled,
    Publishing,
    Published,
    Archived
}

// Content status for Insights and Posts
public enum ContentStatus
{
    Draft,
    Approved,
    Rejected,
    Published,
    Archived
}

// Post-specific status
public enum PostStatus
{
    Draft,
    Approved,
    Rejected,
    Scheduled,
    Published,
    Failed,
    Archived
}

// Scheduled post status
public enum ScheduledPostStatus
{
    Pending,
    Processing,
    Published,
    Failed,
    Cancelled,
    Republishing,
    Retry
}

// Social platforms
public enum SocialPlatform
{
    LinkedIn,
    Twitter,
    Facebook,
    Instagram
}

// Activity types for project timeline
public enum ProjectActivityType
{
    StageChanged,
    AutomationTriggered,
    InsightsReviewed,
    PostsReviewed,
    PostsScheduled,
    PublishResult,
    ProjectCreated,
    ProjectArchived,
    ProjectRestored
}

// Additional status enums for entities
public enum TranscriptStatus
{
    Pending,
    Processing,
    Processed,
    Failed
}

public enum InsightStatus
{
    Draft,
    Approved,
    Rejected
}
