using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<IEnumerable<Post>> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<Post>> GetApprovedPostsAsync();
    Task<IEnumerable<Post>> GetPendingPostsAsync();
    Task<IEnumerable<Post>> GetScheduledPostsAsync();
    Task<IEnumerable<Post>> GetPublishedPostsAsync();
    Task<Post?> GetWithSchedulesAsync(string id);
    Task<int> GetPostCountByProjectAsync(string projectId);
}