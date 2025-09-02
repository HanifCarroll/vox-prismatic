using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces.Repositories;

public interface INotificationRepository : IRepository<Notification>
{
    Task<IEnumerable<Notification>> GetUnreadNotificationsAsync();
    Task<IEnumerable<Notification>> GetByUserIdAsync(Guid userId);
    Task<int> GetUnreadCountAsync();
    Task MarkAsReadAsync(string id);
    Task MarkAllAsReadAsync();
}