using ContentCreation.Core.DTOs;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Interfaces;

public interface IContentProjectService
{
    Task<ContentProjectDto> CreateProjectAsync(CreateProjectDto dto, string userId);
    Task<ContentProjectDetailDto> GetProjectByIdAsync(string projectId);
    Task<ContentProjectDto> UpdateProjectAsync(string projectId, UpdateProjectDto dto);
    Task<(List<ContentProjectDto> Items, int TotalCount)> GetProjectsAsync(ProjectFilterDto filter);
    Task DeleteProjectAsync(string projectId);
    Task<ContentProjectDto> ChangeProjectStageAsync(string projectId, string newStage);
    Task<ContentProjectDto> AdvanceStageAsync(string projectId, string userId);
    Task<ContentProjectDto> UpdateLifecycleStageAsync(string projectId, string stage);
    
    Task<ContentProjectDto> ProcessContentAsync(string projectId, ProcessContentDto dto);
    Task<ContentProjectDto> ExtractInsightsAsync(string projectId);
    Task<ContentProjectDto> GeneratePostsAsync(string projectId, List<string>? insightIds = null);
    Task<ContentProjectDto> SchedulePostsAsync(string projectId, List<string>? postIds = null);
    Task<ContentProjectDto> PublishNowAsync(string projectId, List<string> postIds);
    
    Task<ProjectMetricsDto> UpdateProjectMetricsAsync(string projectId);
    Task RecordProjectActivityAsync(string projectId, string activityType, string? activityName, string? metadata = null, string? userId = null);
    Task<List<ProjectActivityDto>> GetProjectActivitiesAsync(string projectId, int limit = 20);
    
    Task<Dictionary<string, int>> GetProjectCountsByStageAsync(string? userId = null);
    Task<List<ContentProjectDto>> GetActionableProjectsAsync(string? userId = null);
}