using Microsoft.EntityFrameworkCore;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class NotificationRepository : Repository<Notification>, INotificationRepository
{
    public NotificationRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<Notification>> GetUnreadNotificationsAsync()
    {
        return await _dbSet
            .Where(n => n.Status != NotificationStatus.Read)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Notification>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync()
    {
        return await _dbSet.CountAsync(n => n.Status != NotificationStatus.Read);
    }

    public async Task MarkAsReadAsync(string id)
    {
        var notification = await _dbSet.FindAsync(Guid.Parse(id));
        if (notification != null)
        {
            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;
        }
    }

    public async Task MarkAllAsReadAsync()
    {
        var unreadNotifications = await _dbSet
            .Where(n => n.Status != NotificationStatus.Read)
            .ToListAsync();

        foreach (var notification in unreadNotifications)
        {
            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;
        }
    }
}