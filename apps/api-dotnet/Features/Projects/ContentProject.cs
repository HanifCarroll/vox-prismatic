using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Transcripts;
using ContentCreation.Api.Features.Insights;
using ContentCreation.Api.Features.Posts;

namespace ContentCreation.Api.Features.Projects;

public class ContentProject
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public List<string> Tags { get; set; } = new();
    
    [MaxLength(50)]
    public string SourceType { get; set; } = "transcript";
    
    [MaxLength(500)]
    public string? SourceUrl { get; set; }
    
    [MaxLength(255)]
    public string? FileName { get; set; }
    
    [MaxLength(500)]
    public string? FilePath { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string CurrentStage { get; set; } = ProjectLifecycleStage.RawContent;
    
    public int OverallProgress { get; set; } = 0;
    
    public string CreatedBy { get; set; } = "system";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastActivityAt { get; set; }
    
    public WorkflowConfiguration WorkflowConfig { get; set; } = new();
    
    public ProjectMetrics Metrics { get; set; } = new();
    
    public string? TranscriptId { get; set; }
    public virtual Transcript? Transcript { get; set; }
    
    public virtual ICollection<Insight> Insights { get; set; } = new List<Insight>();
    
    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
    
    public virtual ICollection<ProjectScheduledPost> ScheduledPosts { get; set; } = new List<ProjectScheduledPost>();
    
    public virtual ICollection<ProjectProcessingJob> ProcessingJobs { get; set; } = new List<ProjectProcessingJob>();
    
    public virtual ICollection<ProjectEvent> Events { get; set; } = new List<ProjectEvent>();
}

public class WorkflowConfiguration
{
    public bool AutoApproveInsights { get; set; } = false;
    public int MinInsightScore { get; set; } = 70;
    public bool AutoGeneratePosts { get; set; } = false;
    public bool AutoSchedulePosts { get; set; } = false;
    public List<string> TargetPlatforms { get; set; } = new() { "linkedin", "x" };
    public PublishingSchedule PublishingSchedule { get; set; } = new();
}

public class PublishingSchedule
{
    public List<DayOfWeek> PreferredDays { get; set; } = new() 
    { 
        DayOfWeek.Monday, 
        DayOfWeek.Wednesday, 
        DayOfWeek.Friday 
    };
    
    public TimeOnly PreferredTime { get; set; } = new TimeOnly(9, 0);
    
    public string TimeZone { get; set; } = "UTC";
    
    public int MinimumInterval { get; set; } = 4;
}

public class ProjectMetrics
{
    public int TranscriptWordCount { get; set; } = 0;
    public int InsightsTotal { get; set; } = 0;
    public int InsightsApproved { get; set; } = 0;
    public int InsightsRejected { get; set; } = 0;
    public int PostsTotal { get; set; } = 0;
    public int PostsApproved { get; set; } = 0;
    public int PostsScheduled { get; set; } = 0;
    public int PostsPublished { get; set; } = 0;
    public int PostsFailed { get; set; } = 0;
    public int TotalProcessingTimeMs { get; set; } = 0;
    public float EstimatedCost { get; set; } = 0;
}

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