using ContentCreation.Core.DTOs;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Interfaces;

public interface IContentProjectService
{
    Task<ContentProjectDto> CreateProjectAsync(CreateProjectDto dto, Guid userId);
    Task<ContentProjectDetailDto> GetProjectByIdAsync(Guid projectId);
    Task<ContentProjectDto> UpdateProjectAsync(Guid projectId, UpdateProjectDto dto);
    Task<(List<ContentProjectDto> Items, int TotalCount)> GetProjectsAsync(ProjectFilterDto filter);
    Task DeleteProjectAsync(Guid projectId);
    Task<ContentProjectDto> ChangeProjectStageAsync(Guid projectId, string newStage);
    Task<ContentProjectDto> AdvanceStageAsync(Guid projectId, Guid userId);
    Task<ContentProjectDto> UpdateLifecycleStageAsync(Guid projectId, string stage);
    
    Task<ContentProjectDto> ProcessContentAsync(Guid projectId, ProcessContentDto dto);
    Task<ContentProjectDto> ExtractInsightsAsync(Guid projectId);
    Task<ContentProjectDto> GeneratePostsAsync(Guid projectId, List<Guid>? insightIds = null);
    Task<ContentProjectDto> SchedulePostsAsync(Guid projectId, List<Guid>? postIds = null);
    Task<ContentProjectDto> PublishNowAsync(Guid projectId, List<Guid> postIds);
    
    Task<ProjectMetricsDto> UpdateProjectMetricsAsync(Guid projectId);
    Task RecordProjectActivityAsync(Guid projectId, string activityType, string? activityName, string? metadata = null, Guid? userId = null);
    Task<List<ProjectActivityDto>> GetProjectActivitiesAsync(Guid projectId, int limit = 20);
    
    Task<Dictionary<string, int>> GetProjectCountsByStageAsync(Guid? userId = null);
    Task<List<ContentProjectDto>> GetActionableProjectsAsync(Guid? userId = null);
}