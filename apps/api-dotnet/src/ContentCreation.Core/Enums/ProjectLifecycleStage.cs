namespace ContentCreation.Core.Enums;

public static class ProjectLifecycleStage
{
    public const string RawContent = "raw_content";
    public const string ProcessingContent = "processing_content";
    public const string InsightsReady = "insights_ready";
    public const string InsightsApproved = "insights_approved";
    public const string PostsGenerated = "posts_generated";
    public const string PostsApproved = "posts_approved";
    public const string Scheduled = "scheduled";
    public const string Publishing = "publishing";
    public const string Published = "published";
    public const string Archived = "archived";
    
    public static readonly List<string> AllStages = new()
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