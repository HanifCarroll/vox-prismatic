using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class ContentProject
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
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
    public string CurrentStage { get; set; } = "raw_content";
    
    public int OverallProgress { get; set; } = 0;
    
    public Guid CreatedBy { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastActivityAt { get; set; }
    
    public AutoApprovalSettings AutoApprovalSettings { get; set; } = new();
    
    public PublishingSchedule PublishingSchedule { get; set; } = new();
    
    public List<string> TargetPlatforms { get; set; } = new() { "linkedin" };
    
    public Guid? TranscriptId { get; set; }
    public virtual Transcript? Transcript { get; set; }
    
    public virtual ICollection<Insight> Insights { get; set; } = new List<Insight>();
    
    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
    
    public virtual ICollection<ProjectScheduledPost> ScheduledPosts { get; set; } = new List<ProjectScheduledPost>();
    
    public virtual ICollection<ProjectProcessingJob> ProcessingJobs { get; set; } = new List<ProjectProcessingJob>();
    
    public virtual ICollection<ProjectActivity> Activities { get; set; } = new List<ProjectActivity>();
    
    // Project metrics for analytics and reporting
    public ProjectMetrics Metrics { get; set; } = new();
    
    // Workflow configuration for this project
    public WorkflowConfiguration WorkflowConfig { get; set; } = new();
    
    // Computed property for project summary
    public ProjectSummary GetSummary()
    {
        return new ProjectSummary
        {
            InsightsTotal = Insights?.Count ?? 0,
            InsightsApproved = Insights?.Count(i => i.IsApproved) ?? 0,
            PostsTotal = Posts?.Count ?? 0,
            PostsScheduled = ScheduledPosts?.Count(sp => sp.Status == "scheduled") ?? 0,
            PostsPublished = ScheduledPosts?.Count(sp => sp.Status == "published") ?? 0
        };
    }
}

public class AutoApprovalSettings
{
    public bool AutoApproveInsights { get; set; } = false;
    public int MinInsightScore { get; set; } = 70;
    public bool AutoGeneratePosts { get; set; } = false;
    public bool AutoSchedulePosts { get; set; } = false;
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

public class ProjectSummary
{
    public int InsightsTotal { get; set; }
    public int InsightsApproved { get; set; }
    public int PostsTotal { get; set; }
    public int PostsScheduled { get; set; }
    public int PostsPublished { get; set; }
}