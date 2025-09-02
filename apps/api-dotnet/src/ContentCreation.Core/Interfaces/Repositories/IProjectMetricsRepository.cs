using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IProjectMetricsRepository : IRepository<ProjectMetrics>
{
    Task<ProjectMetrics?> GetByProjectIdAsync(string projectId);
    Task UpdateMetricsAsync(string projectId, Action<ProjectMetrics> updateAction);
}