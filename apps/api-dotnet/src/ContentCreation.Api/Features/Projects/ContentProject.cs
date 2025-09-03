using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common.Events;

namespace ContentCreation.Api.Features.Projects;

public class ContentProject
{
    private readonly List<DomainEvent> _domainEvents = new();
    
    [Key]
    public Guid Id { get; private set; }
    
    [Required]
    [MaxLength(200)]
    public string Title { get; private set; }
    
    [MaxLength(1000)]
    public string? Description { get; private set; }
    
    public List<string> Tags { get; private set; }
    
    [MaxLength(50)]
    public string SourceType { get; private set; }
    
    [MaxLength(500)]
    public string? SourceUrl { get; private set; }
    
    [MaxLength(255)]
    public string? FileName { get; private set; }
    
    [MaxLength(500)]
    public string? FilePath { get; private set; }
    
    [Required]
    public ProjectStage CurrentStage { get; private set; } = ProjectStage.RawContent;
    
    public int OverallProgress { get; private set; } = 0;
    
    public Guid CreatedBy { get; private set; }
    
    [Required]
    public Guid UserId { get; private set; }
    
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    
    public DateTime? LastActivityAt { get; private set; }
    
    public AutoApprovalSettings AutoApprovalSettings { get; private set; } = new();
    
    public PublishingSchedule PublishingSchedule { get; private set; } = new();
    
    public List<string> TargetPlatforms { get; private set; } = new() { "linkedin" };
    
    public Guid? TranscriptId { get; private set; }
    public virtual Transcript? Transcript { get; private set; }
    
    public virtual ICollection<Insight> Insights { get; private set; } = new List<Insight>();
    
    public virtual ICollection<Post> Posts { get; private set; } = new List<Post>();
    
    public virtual ICollection<ProjectScheduledPost> ScheduledPosts { get; private set; } = new List<ProjectScheduledPost>();
    
    public virtual ICollection<ProjectProcessingJob> ProcessingJobs { get; private set; } = new List<ProjectProcessingJob>();
    
    public virtual ICollection<ProjectActivity> Activities { get; private set; } = new List<ProjectActivity>();
    
    // Project metrics for analytics and reporting
    public ProjectMetrics Metrics { get; private set; } = new();
    
    // Workflow configuration for this project
    public WorkflowConfiguration WorkflowConfig { get; private set; } = new();
    
    // Domain Events
    public IReadOnlyCollection<DomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    // Private constructor for EF Core
    private ContentProject()
    {
        Id = Guid.NewGuid();
        Title = string.Empty;
        Tags = new();
        SourceType = "transcript";
        TargetPlatforms = new() { "linkedin" };
        AutoApprovalSettings = new();
        PublishingSchedule = new();
        Insights = new List<Insight>();
        Posts = new List<Post>();
        ScheduledPosts = new List<ProjectScheduledPost>();
        ProcessingJobs = new List<ProjectProcessingJob>();
        Activities = new List<ProjectActivity>();
        Metrics = new();
        WorkflowConfig = new();
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    // Private constructor for factory method
    private ContentProject(
        string title,
        string? description,
        string sourceType,
        string? sourceUrl,
        string? fileName,
        string? filePath,
        Guid userId,
        List<string>? tags,
        List<string>? targetPlatforms) : this()
    {
        Id = Guid.NewGuid();
        Title = title;
        Description = description;
        SourceType = sourceType;
        SourceUrl = sourceUrl;
        FileName = fileName;
        FilePath = filePath;
        UserId = userId;
        CreatedBy = userId;
        Tags = tags ?? new();
        TargetPlatforms = targetPlatforms ?? new() { "linkedin" };
        CurrentStage = ProjectStage.RawContent;
        OverallProgress = 0;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    // Factory method for creating new project
    public static ContentProject Create(
        string title,
        string? description,
        string sourceType,
        string? sourceUrl,
        string? fileName,
        string? filePath,
        Guid userId,
        List<string>? tags = null,
        List<string>? targetPlatforms = null)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required", nameof(title));
        
        if (title.Length > 200)
            throw new ArgumentException("Title must not exceed 200 characters", nameof(title));
        
        if (userId == Guid.Empty)
            throw new ArgumentException("User ID is required", nameof(userId));
        
        var project = new ContentProject(
            title,
            description,
            sourceType,
            sourceUrl,
            fileName,
            filePath,
            userId,
            tags,
            targetPlatforms
        );
        
        project.AddDomainEvent(new ProjectCreatedEvent(project.Id, userId));
        return project;
    }
    
    // State transition methods
    public void TransitionTo(ProjectStage newStage)
    {
        if (!CanTransitionTo(newStage))
            throw new InvalidOperationException($"Cannot transition from {CurrentStage} to {newStage}");
        
        var previousStage = CurrentStage;
        CurrentStage = newStage;
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        UpdateProgress();
        
        AddDomainEvent(new ProjectStageChangedEvent(Id, previousStage, newStage, UserId));
    }
    
    // Business logic for approving insights
    public void ApproveInsight(Guid insightId, string approvedBy)
    {
        var insight = Insights.FirstOrDefault(i => i.Id == insightId)
            ?? throw new InvalidOperationException($"Insight {insightId} not found in project");
        
        insight.Approve(approvedBy);
        
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        
        // Check if all insights are reviewed
        if (Insights.All(i => i.IsReviewed))
        {
            if (Insights.Any(i => i.IsApproved))
            {
                TransitionTo(ProjectStage.InsightsApproved);
            }
        }
        
        AddDomainEvent(new InsightApprovedEvent(Id, insightId, approvedBy));
    }
    
    public void RejectInsight(Guid insightId, string rejectedBy, string reason)
    {
        var insight = Insights.FirstOrDefault(i => i.Id == insightId)
            ?? throw new InvalidOperationException($"Insight {insightId} not found in project");
        
        insight.Reject(rejectedBy, reason);
        
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        
        AddDomainEvent(new InsightRejectedEvent(Id, insightId, rejectedBy, reason));
    }
    
    // Business logic for approving posts
    public void ApprovePost(Guid postId, string approvedBy)
    {
        var post = Posts.FirstOrDefault(p => p.Id == postId)
            ?? throw new InvalidOperationException($"Post {postId} not found in project");
        
        post.Approve(approvedBy);
        
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        
        // Check if all posts are reviewed
        if (Posts.All(p => p.IsReviewed))
        {
            if (Posts.Any(p => p.IsApproved))
            {
                TransitionTo(ProjectStage.PostsApproved);
            }
        }
        
        AddDomainEvent(new PostApprovedEvent(Id, postId, approvedBy));
    }
    
    public void RejectPost(Guid postId, string rejectedBy, string reason)
    {
        var post = Posts.FirstOrDefault(p => p.Id == postId)
            ?? throw new InvalidOperationException($"Post {postId} not found in project");
        
        post.Reject(rejectedBy, reason);
        
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        
        AddDomainEvent(new PostRejectedEvent(Id, postId, rejectedBy, reason));
    }
    
    // Bulk approval methods
    public void ApproveAllInsights(string approvedBy)
    {
        var pendingInsights = Insights.Where(i => !i.IsApproved && !i.IsReviewed).ToList();
        
        if (!pendingInsights.Any())
            throw new InvalidOperationException("No pending insights to approve");
        
        foreach (var insight in pendingInsights)
        {
            insight.Approve(approvedBy);
        }
        
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        TransitionTo(ProjectStage.InsightsApproved);
        
        AddDomainEvent(new AllInsightsApprovedEvent(Id, approvedBy, pendingInsights.Count));
    }
    
    public void ApproveAllPosts(string approvedBy)
    {
        var pendingPosts = Posts.Where(p => !p.IsApproved && !p.IsReviewed).ToList();
        
        if (!pendingPosts.Any())
            throw new InvalidOperationException("No pending posts to approve");
        
        foreach (var post in pendingPosts)
        {
            post.Approve(approvedBy);
        }
        
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        TransitionTo(ProjectStage.PostsApproved);
        
        AddDomainEvent(new AllPostsApprovedEvent(Id, approvedBy, pendingPosts.Count));
    }
    
    // Processing methods
    public void StartProcessing()
    {
        if (CurrentStage != ProjectStage.RawContent)
            throw new InvalidOperationException($"Cannot start processing from stage {CurrentStage}");
        
        TransitionTo(ProjectStage.ProcessingContent);
    }
    
    public void CompleteProcessing()
    {
        if (CurrentStage != ProjectStage.ProcessingContent)
            throw new InvalidOperationException($"Cannot complete processing from stage {CurrentStage}");
        
        TransitionTo(ProjectStage.InsightsReady);
    }
    
    public void FailProcessing(string errorMessage)
    {
        if (CurrentStage != ProjectStage.ProcessingContent)
            throw new InvalidOperationException($"Cannot fail processing from stage {CurrentStage}");
        
        TransitionTo(ProjectStage.RawContent);
        AddDomainEvent(new ProcessingFailedEvent(Id, errorMessage));
    }
    
    public void StartGeneratingPosts()
    {
        if (CurrentStage != ProjectStage.InsightsApproved)
            throw new InvalidOperationException($"Cannot generate posts from stage {CurrentStage}");
        
        if (!Insights.Any(i => i.IsApproved))
            throw new InvalidOperationException("No approved insights available for generating posts");
        
        TransitionTo(ProjectStage.PostsGenerated);
    }
    
    public void SchedulePosts()
    {
        if (CurrentStage != ProjectStage.PostsApproved)
            throw new InvalidOperationException($"Cannot schedule posts from stage {CurrentStage}");
        
        if (!Posts.Any(p => p.IsApproved))
            throw new InvalidOperationException("No approved posts available for scheduling");
        
        TransitionTo(ProjectStage.Scheduled);
    }
    
    public void StartPublishing()
    {
        if (CurrentStage != ProjectStage.Scheduled && CurrentStage != ProjectStage.PostsApproved)
            throw new InvalidOperationException($"Cannot start publishing from stage {CurrentStage}");
        
        TransitionTo(ProjectStage.Publishing);
    }
    
    public void CompletePublishing()
    {
        if (CurrentStage != ProjectStage.Publishing)
            throw new InvalidOperationException($"Cannot complete publishing from stage {CurrentStage}");
        
        TransitionTo(ProjectStage.Published);
    }
    
    public void FailPublishing(string errorMessage)
    {
        if (CurrentStage != ProjectStage.Publishing)
            throw new InvalidOperationException($"Cannot fail publishing from stage {CurrentStage}");
        
        TransitionTo(ProjectStage.Scheduled);
        AddDomainEvent(new PublishingFailedEvent(Id, errorMessage));
    }
    
    // Archive and restore
    public void Archive(string archivedBy, string reason)
    {
        if (CurrentStage == ProjectStage.Archived)
            throw new InvalidOperationException("Project is already archived");
        
        TransitionTo(ProjectStage.Archived);
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        
        AddDomainEvent(new ProjectArchivedEvent(Id, archivedBy, reason));
    }
    
    public void Restore(string restoredBy)
    {
        if (CurrentStage != ProjectStage.Archived)
            throw new InvalidOperationException("Only archived projects can be restored");
        
        TransitionTo(ProjectStage.RawContent);
        UpdatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
        
        AddDomainEvent(new ProjectRestoredEvent(Id, restoredBy));
    }
    
    // Update project metadata
    public void UpdateDetails(string? title = null, string? description = null, List<string>? tags = null)
    {
        if (!string.IsNullOrWhiteSpace(title))
        {
            if (title.Length > 200)
                throw new ArgumentException("Title must not exceed 200 characters", nameof(title));
            Title = title;
        }
        
        if (description != null)
        {
            if (description.Length > 1000)
                throw new ArgumentException("Description must not exceed 1000 characters", nameof(description));
            Description = description;
        }
        
        if (tags != null)
            Tags = tags;
        
        UpdatedAt = DateTime.UtcNow;
    }
    
    // Configure automation settings
    public void ConfigureAutoApproval(
        bool autoApproveInsights,
        int minInsightScore = 70,
        bool autoGeneratePosts = false,
        bool autoSchedulePosts = false)
    {
        AutoApprovalSettings = new AutoApprovalSettings
        {
            AutoApproveInsights = autoApproveInsights,
            MinInsightScore = minInsightScore,
            AutoGeneratePosts = autoGeneratePosts,
            AutoSchedulePosts = autoSchedulePosts
        };
        
        UpdatedAt = DateTime.UtcNow;
    }
    
    // Configure publishing schedule
    public void ConfigurePublishingSchedule(
        List<DayOfWeek> preferredDays,
        TimeOnly preferredTime,
        string timeZone,
        int minimumInterval)
    {
        if (minimumInterval < 1)
            throw new ArgumentException("Minimum interval must be at least 1 hour", nameof(minimumInterval));
        
        PublishingSchedule = new PublishingSchedule
        {
            PreferredDays = preferredDays,
            PreferredTime = preferredTime,
            TimeZone = timeZone,
            MinimumInterval = minimumInterval
        };
        
        UpdatedAt = DateTime.UtcNow;
    }
    
    // Validation methods
    public bool CanProcessContent()
    {
        return CurrentStage == ProjectStage.RawContent && 
               !string.IsNullOrEmpty(FilePath);
    }
    
    public bool CanExtractInsights()
    {
        return CurrentStage == ProjectStage.ProcessingContent &&
               Transcript != null;
    }
    
    public bool CanGeneratePosts()
    {
        return CurrentStage == ProjectStage.InsightsApproved &&
               Insights.Any(i => i.IsApproved);
    }
    
    public bool CanSchedulePosts()
    {
        return CurrentStage == ProjectStage.PostsApproved &&
               Posts.Any(p => p.IsApproved);
    }
    
    public bool CanPublish()
    {
        return (CurrentStage == ProjectStage.Scheduled || CurrentStage == ProjectStage.PostsApproved) &&
               Posts.Any(p => p.IsApproved);
    }
    
    public bool HasPendingInsights()
    {
        return Insights.Any(i => !i.IsReviewed);
    }
    
    public bool HasPendingPosts()
    {
        return Posts.Any(p => !p.IsReviewed);
    }
    
    public int GetApprovedInsightsCount()
    {
        return Insights.Count(i => i.IsApproved);
    }
    
    public int GetApprovedPostsCount()
    {
        return Posts.Count(p => p.IsApproved);
    }
    
    // Computed property for project summary
    public ProjectSummary GetSummary()
    {
        return new ProjectSummary
        {
            InsightsTotal = Insights?.Count ?? 0,
            InsightsApproved = Insights?.Count(i => i.IsApproved) ?? 0,
            PostsTotal = Posts?.Count ?? 0,
            PostsScheduled = ScheduledPosts?.Count(sp => sp.Status == ScheduledPostStatus.Pending) ?? 0,
            PostsPublished = ScheduledPosts?.Count(sp => sp.Status == ScheduledPostStatus.Published) ?? 0
        };
    }
    
    // Private helper methods
    private bool CanTransitionTo(ProjectStage newStage)
    {
        return (CurrentStage, newStage) switch
        {
            // From RawContent
            (ProjectStage.RawContent, ProjectStage.ProcessingContent) => true,
            (ProjectStage.RawContent, ProjectStage.Archived) => true,
            
            // From ProcessingContent
            (ProjectStage.ProcessingContent, ProjectStage.InsightsReady) => true,
            (ProjectStage.ProcessingContent, ProjectStage.RawContent) => true, // Failed processing
            (ProjectStage.ProcessingContent, ProjectStage.Archived) => true,
            
            // From InsightsReady
            (ProjectStage.InsightsReady, ProjectStage.InsightsApproved) => true,
            (ProjectStage.InsightsReady, ProjectStage.ProcessingContent) => true, // Rejected insights
            (ProjectStage.InsightsReady, ProjectStage.Archived) => true,
            
            // From InsightsApproved
            (ProjectStage.InsightsApproved, ProjectStage.PostsGenerated) => true,
            (ProjectStage.InsightsApproved, ProjectStage.Archived) => true,
            
            // From PostsGenerated
            (ProjectStage.PostsGenerated, ProjectStage.PostsApproved) => true,
            (ProjectStage.PostsGenerated, ProjectStage.InsightsApproved) => true, // Rejected posts
            (ProjectStage.PostsGenerated, ProjectStage.Archived) => true,
            
            // From PostsApproved
            (ProjectStage.PostsApproved, ProjectStage.Scheduled) => true,
            (ProjectStage.PostsApproved, ProjectStage.Publishing) => true, // Direct publish
            (ProjectStage.PostsApproved, ProjectStage.Archived) => true,
            
            // From Scheduled
            (ProjectStage.Scheduled, ProjectStage.Publishing) => true,
            (ProjectStage.Scheduled, ProjectStage.Archived) => true,
            
            // From Publishing
            (ProjectStage.Publishing, ProjectStage.Published) => true,
            (ProjectStage.Publishing, ProjectStage.Scheduled) => true, // Failed publishing
            (ProjectStage.Publishing, ProjectStage.Archived) => true,
            
            // From Published
            (ProjectStage.Published, ProjectStage.Archived) => true,
            
            // From Archived
            (ProjectStage.Archived, ProjectStage.RawContent) => true, // Restore
            
            _ => false
        };
    }
    
    private void UpdateProgress()
    {
        OverallProgress = CurrentStage switch
        {
            ProjectStage.RawContent => 0,
            ProjectStage.ProcessingContent => 10,
            ProjectStage.InsightsReady => 30,
            ProjectStage.InsightsApproved => 50,
            ProjectStage.PostsGenerated => 70,
            ProjectStage.PostsApproved => 80,
            ProjectStage.Scheduled => 90,
            ProjectStage.Publishing => 95,
            ProjectStage.Published => 100,
            ProjectStage.Archived => OverallProgress, // Keep current progress
            _ => 0
        };
    }
    
    private void AddDomainEvent(DomainEvent domainEvent)
    {
        _domainEvents.Add(domainEvent);
    }
    
    public void ClearDomainEvents()
    {
        _domainEvents.Clear();
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