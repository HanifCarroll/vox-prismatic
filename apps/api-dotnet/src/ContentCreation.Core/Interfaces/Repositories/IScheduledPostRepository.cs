using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IScheduledPostRepository : IRepository<ScheduledPost>
{
    Task<IEnumerable<ScheduledPost>> GetUpcomingPostsAsync();
    Task<IEnumerable<ScheduledPost>> GetPostsDueForPublishingAsync();
    Task<IEnumerable<ScheduledPost>> GetByPostIdAsync(string postId);
    Task<IEnumerable<ScheduledPost>> GetByDateRangeAsync(DateTime start, DateTime end);
}