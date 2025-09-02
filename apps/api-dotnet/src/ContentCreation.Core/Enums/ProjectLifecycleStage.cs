namespace ContentCreation.Core.Enums;

public static class ProjectLifecycleStage
{
    public const string RawContent = "raw_content";
    public const string TranscriptProcessing = "transcript_processing";
    public const string TranscriptCleaned = "transcript_cleaned";
    public const string ProcessingContent = "processing_content";
    public const string InsightsExtracted = "insights_extracted";
    public const string InsightsReady = "insights_ready";
    public const string InsightsApproved = "insights_approved";
    public const string PostsGenerated = "posts_generated";
    public const string PostsApproved = "posts_approved";
    public const string Scheduled = "scheduled";
    public const string Publishing = "publishing";
    public const string Published = "published";
    public const string Archived = "archived";
    public const string Error = "error";
    
    public static readonly List<string> AllStages = new()
    {
        RawContent,
        TranscriptProcessing,
        TranscriptCleaned,
        ProcessingContent,
        InsightsExtracted,
        InsightsReady,
        InsightsApproved,
        PostsGenerated,
        PostsApproved,
        Scheduled,
        Publishing,
        Published,
        Archived,
        Error
    };
    
    public static int GetStageOrder(string stage)
    {
        return AllStages.IndexOf(stage);
    }
    
    public static bool IsValidTransition(string fromStage, string toStage)
    {
        var fromOrder = GetStageOrder(fromStage);
        var toOrder = GetStageOrder(toStage);
        
        if (fromOrder == -1 || toOrder == -1)
            return false;
        
        if (toStage == Archived)
            return true;
        
        return toOrder == fromOrder + 1 || toOrder == fromOrder;
    }
}