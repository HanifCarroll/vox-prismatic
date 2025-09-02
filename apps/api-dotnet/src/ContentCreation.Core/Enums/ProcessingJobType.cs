namespace ContentCreation.Core.Enums;

public static class ProcessingJobType
{
    public const string ProcessContent = "process_content";
    public const string ExtractInsights = "extract_insights";
    public const string GeneratePosts = "generate_posts";
    public const string SchedulePosts = "schedule_posts";
    public const string PublishNow = "publish_now";
    public const string PublishPost = "publish_post";
}

public static class ProcessingJobStatus
{
    public const string Queued = "queued";
    public const string Processing = "processing";
    public const string Completed = "completed";
    public const string Failed = "failed";
    public const string Cancelled = "cancelled";
}