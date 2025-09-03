namespace ContentCreation.Api.Features.Common.Enums;

public enum ProcessingJobType
{
    ProcessContent,
    CleanTranscript,
    ExtractInsights,
    GenerateInsights,
    GeneratePosts,
    SchedulePosts,
    PublishNow,
    PublishPost
}

public enum ProcessingJobStatus
{
    Queued,
    Processing,
    Completed,
    Failed,
    Cancelled
}