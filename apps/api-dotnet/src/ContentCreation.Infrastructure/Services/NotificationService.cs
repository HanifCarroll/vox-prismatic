using ContentCreation.Core.DTOs.Notifications;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificationService> _logger;
    private readonly IMemoryCache _cache;
    private readonly IProjectProgressHub? _progressHub;
    
    private const string UNREAD_COUNT_KEY = "notifications_unread_{0}";
    private const string USER_STATS_KEY = "notifications_stats_{0}";

    public NotificationService(
        ApplicationDbContext context,
        ILogger<NotificationService> logger,
        IMemoryCache cache,
        IProjectProgressHub? progressHub = null)
    {
        _context = context;
        _logger = logger;
        _cache = cache;
        _progressHub = progressHub;
    }

    public async Task<NotificationDto> CreateAsync(CreateNotificationDto dto)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = Guid.Parse(dto.UserId),
            Type = dto.Type,
            Priority = dto.Priority,
            Status = NotificationStatus.Unread,
            Title = dto.Title,
            Message = dto.Message,
            ActionUrl = dto.ActionUrl,
            MetadataJson = dto.Metadata != null ? JsonSerializer.Serialize(dto.Metadata) : null,
            ProjectId = dto.ProjectId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
        
        // Clear cache
        InvalidateUserCache(dto.UserId);
        
        var notificationDto = MapToDto(notification);
        
        // Send real-time notification
        if (_progressHub != null)
        {
            await _progressHub.SendUserNotificationAsync(dto.UserId, new UserNotification
            {
                Type = dto.Type.ToString(),
                Message = dto.Message,
                ProjectId = dto.ProjectId?.ToString(),
                ActionUrl = dto.ActionUrl,
                IsPersistent = dto.Priority == NotificationPriority.High
            });
        }
        
        _logger.LogInformation("Created notification {NotificationId} for user {UserId}", 
            notification.Id, dto.UserId);
        
        return notificationDto;
    }

    public async Task<NotificationDto?> GetByIdAsync(Guid id)
    {
        var notification = await _context.Notifications
            .Include(n => n.Project)
            .FirstOrDefaultAsync(n => n.Id == id);
        
        return notification != null ? MapToDto(notification) : null;
    }

    public async Task<List<NotificationDto>> GetUserNotificationsAsync(NotificationFilterDto filter)
    {
        var query = _context.Notifications
            .Include(n => n.Project)
            .AsQueryable();

        if (!string.IsNullOrEmpty(filter.UserId))
            query = query.Where(n => n.UserId == Guid.Parse(filter.UserId));
        
        if (filter.Type.HasValue)
            query = query.Where(n => n.Type == filter.Type.Value);
        
        if (filter.Priority.HasValue)
            query = query.Where(n => n.Priority == filter.Priority.Value);
        
        if (filter.Status.HasValue)
            query = query.Where(n => n.Status == filter.Status.Value);
        
        if (filter.ProjectId.HasValue)
            query = query.Where(n => n.ProjectId == filter.ProjectId.Value);
        
        if (filter.FromDate.HasValue)
            query = query.Where(n => n.CreatedAt >= filter.FromDate.Value);
        
        if (filter.ToDate.HasValue)
            query = query.Where(n => n.CreatedAt <= filter.ToDate.Value);
        
        query = query.OrderByDescending(n => n.CreatedAt);
        
        var notifications = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();
        
        return notifications.Select(MapToDto).ToList();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var notification = await _context.Notifications.FindAsync(id);
        if (notification == null)
            return false;
        
        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        
        InvalidateUserCache(notification.UserId.ToString());
        
        return true;
    }

    public async Task<int> DeleteOldNotificationsAsync(int daysOld = 30)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-daysOld);
        
        var oldNotifications = await _context.Notifications
            .Where(n => n.CreatedAt < cutoffDate && n.Status != NotificationStatus.Unread)
            .ToListAsync();
        
        if (oldNotifications.Any())
        {
            _context.Notifications.RemoveRange(oldNotifications);
            await _context.SaveChangesAsync();
            
            // Clear cache for affected users
            foreach (var userId in oldNotifications.Select(n => n.UserId).Distinct())
            {
                InvalidateUserCache(userId.ToString());
            }
        }
        
        _logger.LogInformation("Deleted {Count} notifications older than {Days} days", 
            oldNotifications.Count, daysOld);
        
        return oldNotifications.Count;
    }

    public async Task<List<NotificationDto>> CreateBulkAsync(List<CreateNotificationDto> dtos)
    {
        var notifications = dtos.Select(dto => new Notification
        {
            Id = Guid.NewGuid(),
            UserId = Guid.Parse(dto.UserId),
            Type = dto.Type,
            Priority = dto.Priority,
            Status = NotificationStatus.Unread,
            Title = dto.Title,
            Message = dto.Message,
            ActionUrl = dto.ActionUrl,
            MetadataJson = dto.Metadata != null ? JsonSerializer.Serialize(dto.Metadata) : null,
            ProjectId = dto.ProjectId,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();
        
        // Clear cache and send real-time notifications
        var notificationDtos = new List<NotificationDto>();
        foreach (var notification in notifications)
        {
            InvalidateUserCache(notification.UserId.ToString());
            var dto = MapToDto(notification);
            notificationDtos.Add(dto);
            
            if (_progressHub != null)
            {
                await _progressHub.SendUserNotificationAsync(notification.UserId.ToString(), new UserNotification
                {
                    Type = dto.Type.ToString(),
                    Message = dto.Message,
                    ProjectId = dto.ProjectId?.ToString()
                });
            }
        }
        
        return notificationDtos;
    }

    public async Task BroadcastAsync(BroadcastNotificationDto dto)
    {
        var userIds = dto.UserIds;
        
        if (userIds == null || !userIds.Any())
        {
            // Get all active user IDs - you might want to implement this differently
            userIds = await _context.Notifications
                .Select(n => n.UserId.ToString())
                .Distinct()
                .ToListAsync();
        }
        
        var notifications = userIds.Select(userId => new CreateNotificationDto
        {
            UserId = userId,
            Type = dto.Type,
            Priority = dto.Priority,
            Title = dto.Title,
            Message = dto.Message,
            ActionUrl = dto.ActionUrl
        }).ToList();
        
        await CreateBulkAsync(notifications);
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == Guid.Parse(userId));
        
        if (notification == null)
            return false;
        
        notification.Status = NotificationStatus.Read;
        notification.ReadAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        InvalidateUserCache(userId);
        
        // Send real-time update
        if (_progressHub != null)
        {
            await _progressHub.SendUserNotificationAsync(userId, new UserNotification
            {
                Type = "NotificationRead",
                Message = notificationId.ToString()
            });
        }
        
        return true;
    }

    public async Task<int> MarkAllAsReadAsync(MarkAllReadDto dto)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == Guid.Parse(dto.UserId) && n.Status == NotificationStatus.Unread);
        
        if (dto.Type.HasValue)
            query = query.Where(n => n.Type == dto.Type.Value);
        
        var notifications = await query.ToListAsync();
        
        foreach (var notification in notifications)
        {
            notification.Status = NotificationStatus.Read;
            notification.ReadAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
        InvalidateUserCache(dto.UserId);
        
        // Send real-time update
        if (_progressHub != null)
        {
            await _progressHub.SendUserNotificationAsync(dto.UserId, new UserNotification
            {
                Type = "AllNotificationsRead",
                Message = dto.Type?.ToString() ?? "All"
            });
        }
        
        return notifications.Count;
    }

    public async Task<bool> MarkAsDismissedAsync(Guid notificationId, string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == Guid.Parse(userId));
        
        if (notification == null)
            return false;
        
        notification.Status = NotificationStatus.Dismissed;
        notification.DismissedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        InvalidateUserCache(userId);
        
        return true;
    }

    public async Task<bool> ArchiveAsync(Guid notificationId, string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == Guid.Parse(userId));
        
        if (notification == null)
            return false;
        
        notification.Status = NotificationStatus.Archived;
        
        await _context.SaveChangesAsync();
        InvalidateUserCache(userId);
        
        return true;
    }

    public async Task<NotificationStatsDto> GetUserStatsAsync(string userId)
    {
        var cacheKey = string.Format(USER_STATS_KEY, userId);
        
        if (_cache.TryGetValue<NotificationStatsDto>(cacheKey, out var cachedStats) && cachedStats != null)
            return cachedStats;
        
        var notifications = await _context.Notifications
            .Where(n => n.UserId == Guid.Parse(userId))
            .ToListAsync();
        
        var stats = new NotificationStatsDto
        {
            UserId = userId,
            TotalUnread = notifications.Count(n => n.Status == NotificationStatus.Unread),
            TotalRead = notifications.Count(n => n.Status == NotificationStatus.Read),
            HighPriorityUnread = notifications.Count(n => 
                n.Status == NotificationStatus.Unread && n.Priority == NotificationPriority.High),
            UrgentUnread = notifications.Count(n => 
                n.Status == NotificationStatus.Unread && n.Priority == NotificationPriority.Urgent),
            UnreadByType = notifications
                .Where(n => n.Status == NotificationStatus.Unread)
                .GroupBy(n => n.Type)
                .ToDictionary(g => g.Key.ToString(), g => g.Count()),
            LastNotificationAt = notifications.MaxBy(n => n.CreatedAt)?.CreatedAt
        };
        
        _cache.Set(cacheKey, stats, TimeSpan.FromMinutes(5));
        
        return stats;
    }

    public async Task<int> GetUnreadCountAsync(string userId)
    {
        var cacheKey = string.Format(UNREAD_COUNT_KEY, userId);
        
        if (_cache.TryGetValue<int>(cacheKey, out var cachedCount))
            return cachedCount;
        
        var count = await _context.Notifications
            .CountAsync(n => n.UserId == Guid.Parse(userId) && n.Status == NotificationStatus.Unread);
        
        _cache.Set(cacheKey, count, TimeSpan.FromMinutes(5));
        
        return count;
    }

    public async Task<Dictionary<NotificationType, int>> GetUnreadByTypeAsync(string userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == Guid.Parse(userId) && n.Status == NotificationStatus.Unread)
            .GroupBy(n => n.Type)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync();
        
        return notifications.ToDictionary(n => n.Type, n => n.Count);
    }

    public async Task SendRealTimeAlertAsync(string userId, RealTimeAlertDto alert)
    {
        if (_progressHub == null)
        {
            _logger.LogWarning("NotificationHub not available for real-time alerts");
            return;
        }
        
        await _progressHub.SendUserNotificationAsync(userId, new UserNotification
        {
            Type = "RealTimeAlert",
            Message = alert.Message,
            IsPersistent = alert.RequiresAction,
            ActionUrl = alert.ActionUrl
        });
        
        _logger.LogDebug("Sent real-time alert to user {UserId}: {Title}", userId, alert.Title);
    }

    public async Task BroadcastRealTimeAlertAsync(RealTimeAlertDto alert, List<string>? userIds = null)
    {
        if (_progressHub == null)
        {
            _logger.LogWarning("NotificationHub not available for real-time alerts");
            return;
        }
        
        if (userIds != null && userIds.Any())
        {
            foreach (var userId in userIds)
            {
                await _progressHub.SendUserNotificationAsync(userId, new UserNotification
                {
                    Type = "RealTimeAlert",
                    Message = alert.Message,
                    IsPersistent = alert.RequiresAction,
                    ActionUrl = alert.ActionUrl
                });
            }
        }
        else
        {
            await _progressHub.SendGlobalNotificationAsync(new GlobalNotification
            {
                Type = alert.Type.ToString().ToLower(),
                Message = alert.Message,
                ActionUrl = alert.ActionUrl,
                DurationMs = alert.DurationMs
            });
        }
        
        _logger.LogDebug("Broadcast real-time alert: {Title}", alert.Title);
    }

    public async Task NotifyProjectUpdateAsync(Guid projectId, string title, string message, NotificationType type = NotificationType.Info)
    {
        // Get all users associated with the project
        var project = await _context.ContentProjects.FindAsync(projectId);
        if (project == null) return;
        
        var notification = new CreateNotificationDto
        {
            UserId = project.UserId.ToString(),
            Type = type,
            Priority = type == NotificationType.Error ? NotificationPriority.High : NotificationPriority.Normal,
            Title = title,
            Message = message,
            ProjectId = projectId,
            ActionUrl = $"/projects/{projectId}"
        };
        
        await CreateAsync(notification);
    }

    public async Task NotifyPipelineStatusAsync(Guid projectId, PipelineStage stage, string message)
    {
        var type = stage switch
        {
            PipelineStage.Failed => NotificationType.Error,
            PipelineStage.Completed => NotificationType.Success,
            PipelineStage.InsightsReview or PipelineStage.PostsReview => NotificationType.ReviewRequired,
            _ => NotificationType.PipelineUpdate
        };
        
        await NotifyProjectUpdateAsync(projectId, $"Pipeline: {stage}", message, type);
    }

    public async Task NotifyReviewRequiredAsync(Guid projectId, string itemType, string message)
    {
        await NotifyProjectUpdateAsync(projectId, $"Review Required: {itemType}", message, NotificationType.ReviewRequired);
        
        // Also send real-time alert
        var project = await _context.ContentProjects.FindAsync(projectId);
        if (project != null)
        {
            await SendRealTimeAlertAsync(project.UserId.ToString(), new RealTimeAlertDto
            {
                Title = "Review Required",
                Message = message,
                Type = NotificationType.ReviewRequired,
                Priority = NotificationPriority.High,
                RequiresAction = true,
                ActionLabel = "Review Now",
                ActionUrl = $"/projects/{projectId}/review"
            });
        }
    }

    public async Task NotifyPublishingResultAsync(Guid projectId, bool success, string platform, string message)
    {
        var type = success ? NotificationType.PostPublished : NotificationType.Error;
        var title = success ? $"Published to {platform}" : $"Publishing Failed: {platform}";
        
        await NotifyProjectUpdateAsync(projectId, title, message, type);
    }

    private NotificationDto MapToDto(Notification notification)
    {
        return new NotificationDto
        {
            Id = notification.Id,
            UserId = notification.UserId.ToString(),
            Type = notification.Type,
            Priority = notification.Priority,
            Status = notification.Status,
            Title = notification.Title,
            Message = notification.Message,
            ActionUrl = notification.ActionUrl,
            Metadata = !string.IsNullOrEmpty(notification.MetadataJson) 
                ? JsonSerializer.Deserialize<Dictionary<string, object>>(notification.MetadataJson) 
                : null,
            ProjectId = notification.ProjectId,
            CreatedAt = notification.CreatedAt,
            ReadAt = notification.ReadAt,
            DismissedAt = notification.DismissedAt
        };
    }

    private void InvalidateUserCache(string userId)
    {
        _cache.Remove(string.Format(UNREAD_COUNT_KEY, userId));
        _cache.Remove(string.Format(USER_STATS_KEY, userId));
    }
}