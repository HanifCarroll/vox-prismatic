using Stateless;
using Stateless.Graph;

namespace ContentCreation.Api.Features.Projects.State;

public class ProjectStateMachine
{
    private readonly StateMachine<string, string> _machine;
    private readonly ContentProject _project;
    
    public ProjectStateMachine(ContentProject project)
    {
        _project = project;
        _machine = new StateMachine<string, string>(
            () => _project.CurrentStage,
            s => _project.CurrentStage = s
        );
        
        ConfigureStateMachine();
    }
    
    private void ConfigureStateMachine()
    {
        _machine.Configure(ProjectLifecycleStage.RawContent)
            .Permit(ProjectTriggers.StartProcessing, ProjectLifecycleStage.ProcessingContent)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Entered Raw Content stage"))
            .OnExit(() => LogTransition("Exiting Raw Content stage"));
        
        _machine.Configure(ProjectLifecycleStage.ProcessingContent)
            .Permit(ProjectTriggers.ProcessingComplete, ProjectLifecycleStage.InsightsReady)
            .Permit(ProjectTriggers.ProcessingFailed, ProjectLifecycleStage.RawContent)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Started content processing"))
            .OnExit(() => LogTransition("Content processing completed"));
        
        _machine.Configure(ProjectLifecycleStage.InsightsReady)
            .Permit(ProjectTriggers.InsightsApproved, ProjectLifecycleStage.InsightsApproved)
            .Permit(ProjectTriggers.InsightsRejected, ProjectLifecycleStage.ProcessingContent)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Insights ready for review"))
            .OnExit(() => LogTransition("Insights review completed"));
        
        _machine.Configure(ProjectLifecycleStage.InsightsApproved)
            .Permit(ProjectTriggers.GeneratePosts, ProjectLifecycleStage.PostsGenerated)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Insights approved"))
            .OnExit(() => LogTransition("Moving to post generation"));
        
        _machine.Configure(ProjectLifecycleStage.PostsGenerated)
            .Permit(ProjectTriggers.PostsApproved, ProjectLifecycleStage.PostsApproved)
            .Permit(ProjectTriggers.PostsRejected, ProjectLifecycleStage.InsightsApproved)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Posts generated and ready for review"))
            .OnExit(() => LogTransition("Posts review completed"));
        
        _machine.Configure(ProjectLifecycleStage.PostsApproved)
            .Permit(ProjectTriggers.SchedulePosts, ProjectLifecycleStage.Scheduled)
            .Permit(ProjectTriggers.PublishNow, ProjectLifecycleStage.Publishing)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Posts approved and ready for scheduling"))
            .OnExit(() => LogTransition("Posts scheduled or publishing"));
        
        _machine.Configure(ProjectLifecycleStage.Scheduled)
            .Permit(ProjectTriggers.StartPublishing, ProjectLifecycleStage.Publishing)
            .Permit(ProjectTriggers.CancelSchedule, ProjectLifecycleStage.PostsApproved)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Posts scheduled for future publishing"))
            .OnExit(() => LogTransition("Moving to publishing stage"));
        
        _machine.Configure(ProjectLifecycleStage.Publishing)
            .Permit(ProjectTriggers.PublishingComplete, ProjectLifecycleStage.Published)
            .Permit(ProjectTriggers.PublishingFailed, ProjectLifecycleStage.Scheduled)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Publishing posts to social platforms"))
            .OnExit(() => LogTransition("Publishing process completed"));
        
        _machine.Configure(ProjectLifecycleStage.Published)
            .Permit(ProjectTriggers.Archive, ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("All posts successfully published"))
            .OnExit(() => LogTransition("Moving to archive"));
        
        _machine.Configure(ProjectLifecycleStage.Archived)
            .OnEntry(() => LogTransition("Project archived"));
        
        _machine.OnTransitioned(t =>
        {
            _project.UpdatedAt = DateTime.UtcNow;
            _project.LastActivityAt = DateTime.UtcNow;
            _project.OverallProgress = CalculateProgress(t.Destination);
        });
    }
    
    public bool CanFire(string trigger)
    {
        return _machine.CanFire(trigger);
    }
    
    public async Task FireAsync(string trigger)
    {
        if (!CanFire(trigger))
        {
            throw new InvalidOperationException(
                $"Cannot transition from {_project.CurrentStage} with trigger {trigger}");
        }
        
        await _machine.FireAsync(trigger);
    }
    
    public IEnumerable<string> GetPermittedTriggers()
    {
        return _machine.PermittedTriggers;
    }
    
    public string GetCurrentState()
    {
        return _machine.State;
    }
    
    public string GenerateStateDiagram()
    {
        return UmlDotGraph.Format(_machine.GetInfo());
    }
    
    private void LogTransition(string message)
    {
        Console.WriteLine($"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] Project {_project.Id}: {message}");
    }
    
    private int CalculateProgress(string stage)
    {
        return stage switch
        {
            ProjectLifecycleStage.RawContent => 0,
            ProjectLifecycleStage.ProcessingContent => 10,
            ProjectLifecycleStage.InsightsReady => 25,
            ProjectLifecycleStage.InsightsApproved => 40,
            ProjectLifecycleStage.PostsGenerated => 55,
            ProjectLifecycleStage.PostsApproved => 70,
            ProjectLifecycleStage.Scheduled => 85,
            ProjectLifecycleStage.Publishing => 95,
            ProjectLifecycleStage.Published => 100,
            ProjectLifecycleStage.Archived => 100,
            _ => 0
        };
    }
}

public static class ProjectTriggers
{
    public const string StartProcessing = "start_processing";
    public const string ProcessingComplete = "processing_complete";
    public const string ProcessingFailed = "processing_failed";
    public const string InsightsApproved = "insights_approved";
    public const string InsightsRejected = "insights_rejected";
    public const string GeneratePosts = "generate_posts";
    public const string PostsApproved = "posts_approved";
    public const string PostsRejected = "posts_rejected";
    public const string SchedulePosts = "schedule_posts";
    public const string CancelSchedule = "cancel_schedule";
    public const string PublishNow = "publish_now";
    public const string StartPublishing = "start_publishing";
    public const string PublishingComplete = "publishing_complete";
    public const string PublishingFailed = "publishing_failed";
    public const string Archive = "archive";
}