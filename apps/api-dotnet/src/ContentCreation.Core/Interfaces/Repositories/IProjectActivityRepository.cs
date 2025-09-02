using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IProjectActivityRepository : IRepository<ProjectActivity>
{
    Task<IEnumerable<ProjectActivity>> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<ProjectActivity>> GetRecentActivitiesAsync(int count);
    Task<IEnumerable<ProjectActivity>> GetActivitiesByDateRangeAsync(DateTime start, DateTime end);
}