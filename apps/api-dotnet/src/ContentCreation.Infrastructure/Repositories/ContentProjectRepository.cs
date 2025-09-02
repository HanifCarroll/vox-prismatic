using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class ContentProjectRepository : Repository<ContentProject>, IContentProjectRepository
{
    public ContentProjectRepository(ApplicationDbContext context) : base(context) { }

    public async Task<ContentProject?> GetWithRelatedDataAsync(string id)
    {
        return await _dbSet
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .Include(p => p.Activities)
            .FirstOrDefaultAsync(p => p.Id == id.ToString());
    }

    public async Task<IEnumerable<ContentProject>> GetActiveProjectsAsync()
    {
        return await _dbSet
            .Where(p => p.CurrentStage != "published" && 
                       p.CurrentStage != ProjectLifecycleStage.Archived)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ContentProject>> GetProjectsByUserAsync(Guid userId)
    {
        return await _dbSet
            .Where(p => p.CreatedBy == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ContentProject>> GetProjectsByStageAsync(string stage)
    {
        return await _dbSet
            .Where(p => p.CurrentStage == stage)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync();
    }

    public async Task<ContentProject?> GetProjectWithTranscriptsAsync(string id)
    {
        return await _dbSet
            .Include(p => p.Transcript)
            .FirstOrDefaultAsync(p => p.Id == id.ToString());
    }

    public async Task<ContentProject?> GetProjectWithInsightsAsync(string id)
    {
        return await _dbSet
            .Include(p => p.Insights)
            .FirstOrDefaultAsync(p => p.Id == id.ToString());
    }

    public async Task<ContentProject?> GetProjectWithPostsAsync(string id)
    {
        return await _dbSet
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == id.ToString());
    }

    public async Task<ContentProject?> GetProjectWithFullDetailsAsync(string id)
    {
        return await _dbSet
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .Include(p => p.Posts)
            .ThenInclude(post => post.ScheduledPosts)
            .Include(p => p.Activities)
            .FirstOrDefaultAsync(p => p.Id == id.ToString());
    }

    public async Task<int> GetActiveProjectCountAsync()
    {
        return await _dbSet
            .CountAsync(p => p.CurrentStage != "published" && 
                           p.CurrentStage != ProjectLifecycleStage.Archived);
    }

    public async Task<IEnumerable<ContentProject>> GetRecentProjectsAsync(int count)
    {
        return await _dbSet
            .OrderByDescending(p => p.CreatedAt)
            .Take(count)
            .ToListAsync();
    }
}