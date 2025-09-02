using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IProjectEventRepository : IRepository<ProjectEvent>
{
    Task<IEnumerable<ProjectEvent>> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<ProjectEvent>> GetByEventTypeAsync(string eventType);
    Task<IEnumerable<ProjectEvent>> GetRecentEventsAsync(int count);
}