using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces;

public interface IProjectLifecycleService
{
    Task<ContentProject> TransitionStateAsync(string projectId, string trigger, string? userId = null);
    
    Task<ContentProject> ProcessContentAsync(string projectId, string? userId = null);
    
    Task<ContentProject> ExtractInsightsAsync(string projectId, string? userId = null);
    
    Task<ContentProject> GeneratePostsAsync(string projectId, List<string>? insightIds = null, string? userId = null);
    
    Task<ContentProject> SchedulePostsAsync(string projectId, List<string>? postIds = null, string? userId = null);
    
    Task<ContentProject> PublishNowAsync(string projectId, List<string> postIds, string? userId = null);
    
    Task<ContentProject> ApproveInsightsAsync(string projectId, List<string> insightIds, string? userId = null);
    
    Task<ContentProject> RejectInsightsAsync(string projectId, List<string> insightIds, string? userId = null);
    
    Task<ContentProject> ApprovePostsAsync(string projectId, List<string> postIds, string? userId = null);
    
    Task<ContentProject> RejectPostsAsync(string projectId, List<string> postIds, string? userId = null);
    
    Task<ContentProject> ArchiveProjectAsync(string projectId, string? userId = null);
    
    Task<ContentProject> RestoreProjectAsync(string projectId, string? userId = null);
    
    Task<bool> CanTransitionAsync(string projectId, string trigger);
    
    Task<List<string>> GetAvailableActionsAsync(string projectId);
    
    Task<int> CalculateProjectProgressAsync(string projectId);
    
    Task UpdateProjectMetricsAsync(string projectId);
    
    Task RecordStateTransitionAsync(string projectId, string fromState, string toState, string trigger, string? userId = null);
}