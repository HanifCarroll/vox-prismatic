using ContentCreation.Core.DTOs;
using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces;

public interface IContentProjectService
{
    Task<ContentProjectDto> CreateProjectAsync(CreateProjectDto dto, string userId);
    Task<ContentProjectDetailDto> GetProjectByIdAsync(string projectId);
    Task<ContentProjectDto> UpdateProjectAsync(string projectId, UpdateProjectDto dto);
    Task<(List<ContentProjectDto> Items, int TotalCount)> GetProjectsAsync(ProjectFilterDto filter);
    Task DeleteProjectAsync(string projectId);
    Task<ContentProjectDto> ChangeProjectStageAsync(string projectId, string newStage);
    
    Task<ContentProjectDto> ProcessContentAsync(string projectId, ProcessContentDto dto);
    Task<ContentProjectDto> ExtractInsightsAsync(string projectId);
    Task<ContentProjectDto> GeneratePostsAsync(string projectId, List<string>? insightIds = null);
    Task<ContentProjectDto> SchedulePostsAsync(string projectId, List<string>? postIds = null);
    Task<ContentProjectDto> PublishNowAsync(string projectId, List<string> postIds);
    
    Task<ProjectMetricsDto> UpdateProjectMetricsAsync(string projectId);
    Task RecordProjectEventAsync(string projectId, string eventType, string? eventName, object? eventData = null, string? userId = null);
    Task<List<ProjectEventDto>> GetProjectEventsAsync(string projectId, int limit = 20);
    
    Task<Dictionary<string, int>> GetProjectCountsByStageAsync(string? userId = null);
    Task<List<ContentProjectDto>> GetActionableProjectsAsync(string? userId = null);
}