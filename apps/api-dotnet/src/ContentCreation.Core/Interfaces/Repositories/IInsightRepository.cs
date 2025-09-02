using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IInsightRepository : IRepository<Insight>
{
    Task<IEnumerable<Insight>> GetByProjectIdAsync(string projectId);
    Task<IEnumerable<Insight>> GetApprovedInsightsByProjectAsync(string projectId);
    Task<IEnumerable<Insight>> GetPendingInsightsAsync();
    Task<int> GetInsightCountByProjectAsync(string projectId);
}