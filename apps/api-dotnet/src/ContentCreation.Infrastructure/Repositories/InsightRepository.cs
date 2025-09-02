using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class InsightRepository : Repository<Insight>, IInsightRepository
{
    public InsightRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<Insight>> GetByProjectIdAsync(string projectId)
    {
        return await _dbSet
            .Where(i => i.ProjectId == projectId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Insight>> GetApprovedInsightsByProjectAsync(string projectId)
    {
        return await _dbSet
            .Where(i => i.ProjectId == projectId && i.IsApproved)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Insight>> GetPendingInsightsAsync()
    {
        return await _dbSet
            .Where(i => !i.IsApproved)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> GetInsightCountByProjectAsync(string projectId)
    {
        return await _dbSet
            .CountAsync(i => i.ProjectId == projectId);
    }
}