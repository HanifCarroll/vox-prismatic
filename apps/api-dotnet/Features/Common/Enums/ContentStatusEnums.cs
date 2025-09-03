namespace ContentCreation.Api.Features.Common.Enums;

public enum InsightStatus
{
    Draft,
    Approved,
    Rejected
}

public enum PostStatus
{
    Draft,
    Approved,
    Rejected,
    Scheduled,
    Published,
    Failed
}

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

public enum TranscriptStatus
{
    Pending,
    Processing,
    Processed,
    Failed
}