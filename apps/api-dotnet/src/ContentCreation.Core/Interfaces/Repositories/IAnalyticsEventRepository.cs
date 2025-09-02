using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface IAnalyticsEventRepository : IRepository<AnalyticsEvent>
{
    Task<IEnumerable<AnalyticsEvent>> GetByDateRangeAsync(DateTime start, DateTime end);
    Task<IEnumerable<AnalyticsEvent>> GetByEventTypeAsync(string eventType);
    Task<IEnumerable<AnalyticsEvent>> GetByUserIdAsync(Guid userId);
}