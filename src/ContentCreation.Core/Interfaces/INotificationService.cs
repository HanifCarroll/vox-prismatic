using ContentCreation.Core.DTOs.Notifications;
using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Interfaces;

public interface INotificationService
{
    // CRUD Operations
    Task<NotificationDto> CreateAsync(CreateNotificationDto dto);
    Task<NotificationDto?> GetByIdAsync(Guid id);
    Task<List<NotificationDto>> GetUserNotificationsAsync(NotificationFilterDto filter);
    Task<bool> DeleteAsync(Guid id);
    Task<int> DeleteOldNotificationsAsync(int daysOld = 30);
    
    // Bulk Operations
    Task<List<NotificationDto>> CreateBulkAsync(List<CreateNotificationDto> notifications);
    Task BroadcastAsync(BroadcastNotificationDto dto);
    
    // Status Management
    Task<bool> MarkAsReadAsync(Guid notificationId, string userId);
    Task<int> MarkAllAsReadAsync(MarkAllReadDto dto);
    Task<bool> MarkAsDismissedAsync(Guid notificationId, string userId);
    Task<bool> ArchiveAsync(Guid notificationId, string userId);
    
    // Statistics
    Task<NotificationStatsDto> GetUserStatsAsync(string userId);
    Task<int> GetUnreadCountAsync(string userId);
    Task<Dictionary<NotificationType, int>> GetUnreadByTypeAsync(string userId);
    
    // Real-time Alerts
    Task SendRealTimeAlertAsync(string userId, RealTimeAlertDto alert);
    Task BroadcastRealTimeAlertAsync(RealTimeAlertDto alert, List<string>? userIds = null);
    
    // Project-specific Notifications
    Task NotifyProjectUpdateAsync(Guid projectId, string title, string message, NotificationType type = NotificationType.Info);
    Task NotifyPipelineStatusAsync(Guid projectId, PipelineStage stage, string message);
    Task NotifyReviewRequiredAsync(Guid projectId, string itemType, string message);
    Task NotifyPublishingResultAsync(Guid projectId, bool success, string platform, string message);
}