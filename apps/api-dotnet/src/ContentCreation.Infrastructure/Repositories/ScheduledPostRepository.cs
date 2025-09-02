using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class ScheduledPostRepository : Repository<ScheduledPost>, IScheduledPostRepository
{
    public ScheduledPostRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<ScheduledPost>> GetUpcomingPostsAsync()
    {
        return await _dbSet
            .Where(sp => sp.ScheduledTime > DateTime.UtcNow && sp.Status != "published")
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<ScheduledPost>> GetPostsDueForPublishingAsync()
    {
        return await _dbSet
            .Where(sp => sp.ScheduledTime <= DateTime.UtcNow && sp.Status == "pending")
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<ScheduledPost>> GetByPostIdAsync(string postId)
    {
        return await _dbSet
            .Where(sp => sp.PostId == Guid.Parse(postId))
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<ScheduledPost>> GetByDateRangeAsync(DateTime start, DateTime end)
    {
        return await _dbSet
            .Where(sp => sp.ScheduledTime >= start && sp.ScheduledTime <= end)
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
    }
}