using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IProjectScheduledPostRepository : IRepository<ProjectScheduledPost>
{
    Task<IEnumerable<ProjectScheduledPost>> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<ProjectScheduledPost>> GetUpcomingPostsAsync(string projectId);
}