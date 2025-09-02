namespace ContentCreation.Core.Enums;

public static class ProjectLifecycleStage
{
    public const string RawContent = "RawContent";
    public const string ProcessingContent = "ProcessingContent";
    public const string InsightsReady = "InsightsReady";
    public const string InsightsApproved = "InsightsApproved";
    public const string PostsGenerated = "PostsGenerated";
    public const string PostsApproved = "PostsApproved";
    public const string Scheduled = "Scheduled";
    public const string Publishing = "Publishing";
    public const string Published = "Published";
    public const string Archived = "Archived";
    
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