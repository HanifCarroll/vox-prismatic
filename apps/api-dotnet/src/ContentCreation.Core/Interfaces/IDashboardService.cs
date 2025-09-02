using ContentCreation.Core.DTOs.Dashboard;

namespace ContentCreation.Core.Interfaces;

public interface IDashboardService
{
    Task<DashboardDataDto> GetDashboardDataAsync();
    Task<DashboardCountsDto> GetCountsAsync();
    Task<List<DashboardActivityDto>> GetActivityAsync(int limit = 10);
    Task<DashboardActionableDto> GetActionableItemsAsync();
    Task<PublishingScheduleDto> GetPublishingScheduleAsync();
    Task<DashboardStatsDto> GetStatsAsync();
    Task<WorkflowPipelineStatsDto> GetWorkflowPipelineStatsAsync();
    Task<ProjectOverviewDto> GetProjectOverviewAsync();
    Task<List<ProjectActionItemDto>> GetActionItemsAsync();
    Task InvalidateCacheAsync();
}