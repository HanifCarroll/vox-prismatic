using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class ProjectActivityRepository : Repository<ProjectActivity>, IProjectActivityRepository
{
    public ProjectActivityRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<ProjectActivity>> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .Where(pa => pa.ProjectId == projectId)
            .OrderByDescending(pa => pa.OccurredAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectActivity>> GetRecentActivitiesAsync(int count)
    {
        return await _dbSet
            .OrderByDescending(pa => pa.OccurredAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<IEnumerable<ProjectActivity>> GetActivitiesByDateRangeAsync(DateTime start, DateTime end)
    {
        return await _dbSet
            .Where(pa => pa.OccurredAt >= start && pa.OccurredAt <= end)
            .OrderByDescending(pa => pa.OccurredAt)
            .ToListAsync();
    }
}