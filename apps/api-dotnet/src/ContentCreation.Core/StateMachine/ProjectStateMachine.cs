using Stateless;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.StateMachine;

public class ProjectStateMachine
{
    private readonly StateMachine<string, string> _machine;
    
    public string CurrentState => _machine.State;
    
    public ProjectStateMachine(string initialState)
    {
        _machine = new StateMachine<string, string>(initialState);
        ConfigureTransitions();
    }
    
    private void ConfigureTransitions()
    {
        _machine.Configure(ProjectLifecycleStage.RawContent)
            .Permit(Triggers.ProcessContent, ProjectLifecycleStage.ProcessingContent)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.ProcessingContent)
            .Permit(Triggers.CompleteProcessing, ProjectLifecycleStage.InsightsReady)
            .Permit(Triggers.FailProcessing, ProjectLifecycleStage.RawContent)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.InsightsReady)
            .Permit(Triggers.ApproveInsights, ProjectLifecycleStage.InsightsApproved)
            .Permit(Triggers.RejectInsights, ProjectLifecycleStage.ProcessingContent)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.InsightsApproved)
            .Permit(Triggers.GeneratePosts, ProjectLifecycleStage.PostsGenerated)
            .Permit(Triggers.ReturnToInsights, ProjectLifecycleStage.InsightsReady)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.PostsGenerated)
            .Permit(Triggers.ApprovePosts, ProjectLifecycleStage.PostsApproved)
            .Permit(Triggers.RejectPosts, ProjectLifecycleStage.InsightsApproved)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.PostsApproved)
            .Permit(Triggers.SchedulePosts, ProjectLifecycleStage.Scheduled)
            .Permit(Triggers.PublishNow, ProjectLifecycleStage.Publishing)
            .Permit(Triggers.ReturnToPostGeneration, ProjectLifecycleStage.PostsGenerated)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.Scheduled)
            .Permit(Triggers.StartPublishing, ProjectLifecycleStage.Publishing)
            .Permit(Triggers.CancelSchedule, ProjectLifecycleStage.PostsApproved)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.Publishing)
            .Permit(Triggers.CompletePublishing, ProjectLifecycleStage.Published)
            .Permit(Triggers.FailPublishing, ProjectLifecycleStage.Scheduled)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.Published)
            .Permit(Triggers.Archive, ProjectLifecycleStage.Archived);
            
        _machine.Configure(ProjectLifecycleStage.Archived)
            .Permit(Triggers.Restore, ProjectLifecycleStage.RawContent);
    }
    
    public bool CanFire(string trigger)
    {
        return _machine.CanFire(trigger);
    }
    
    public void Fire(string trigger)
    {
        if (!CanFire(trigger))
        {
            throw new InvalidOperationException($"Cannot fire trigger '{trigger}' from state '{CurrentState}'");
        }
        
        _machine.Fire(trigger);
    }
    
    public async Task FireAsync(string trigger)
    {
        if (!CanFire(trigger))
        {
            throw new InvalidOperationException($"Cannot fire trigger '{trigger}' from state '{CurrentState}'");
        }
        
        await _machine.FireAsync(trigger);
    }
    
    public IEnumerable<string> GetPermittedTriggers()
    {
        return _machine.PermittedTriggers;
    }
    
    public bool IsInFinalState()
    {
        return CurrentState == ProjectLifecycleStage.Published || 
               CurrentState == ProjectLifecycleStage.Archived;
    }
    
    public bool RequiresUserAction()
    {
        return CurrentState == ProjectLifecycleStage.InsightsReady ||
               CurrentState == ProjectLifecycleStage.PostsGenerated ||
               CurrentState == ProjectLifecycleStage.PostsApproved;
    }
    
    public int GetProgressPercentage()
    {
        return CurrentState switch
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

public static class Triggers
{
    public const string ProcessContent = "PROCESS_CONTENT";
    public const string CompleteProcessing = "COMPLETE_PROCESSING";
    public const string FailProcessing = "FAIL_PROCESSING";
    public const string ApproveInsights = "APPROVE_INSIGHTS";
    public const string RejectInsights = "REJECT_INSIGHTS";
    public const string GeneratePosts = "GENERATE_POSTS";
    public const string ApprovePosts = "APPROVE_POSTS";
    public const string RejectPosts = "REJECT_POSTS";
    public const string SchedulePosts = "SCHEDULE_POSTS";
    public const string PublishNow = "PUBLISH_NOW";
    public const string StartPublishing = "START_PUBLISHING";
    public const string CompletePublishing = "COMPLETE_PUBLISHING";
    public const string FailPublishing = "FAIL_PUBLISHING";
    public const string CancelSchedule = "CANCEL_SCHEDULE";
    public const string Archive = "ARCHIVE";
    public const string Restore = "RESTORE";
    public const string ReturnToInsights = "RETURN_TO_INSIGHTS";
    public const string ReturnToPostGeneration = "RETURN_TO_POST_GENERATION";
}