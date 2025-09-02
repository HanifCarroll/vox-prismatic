using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class PostRepository : Repository<Post>, IPostRepository
{
    public PostRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<Post>> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .Where(p => p.ProjectId == projectId)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetApprovedPostsAsync()
    {
        return await _dbSet
            .Where(p => p.IsApproved)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetPendingPostsAsync()
    {
        return await _dbSet
            .Where(p => !p.IsApproved)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetScheduledPostsAsync()
    {
        return await _dbSet
            .Where(p => p.IsApproved && p.Status == "scheduled")
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetPublishedPostsAsync()
    {
        return await _dbSet
            .Where(p => p.Status == "published")
            .OrderByDescending(p => p.PublishedAt)
            .ToListAsync();
    }

    public async Task<Post?> GetWithSchedulesAsync(string id)
    {
        return await _dbSet
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == id.ToString());
    }

    public async Task<int> GetPostCountByProjectAsync(string projectId)
    {
        return await _dbSet
            .CountAsync(p => p.ProjectId == projectId);
    }
}