namespace ContentCreation.Core.Enums;

public enum NotificationType
{
    Info,
    Success,
    Warning,
    Error,
    PipelineUpdate,
    ReviewRequired,
    PostPublished,
    ScheduleUpdate,
    SystemAlert
}

public enum NotificationPriority
{
    Low,
    Normal,
    High,
    Urgent
}

public enum NotificationStatus
{
    Unread,
    Read,
    Archived,
    Dismissed
}