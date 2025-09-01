using ContentCreation.Core.DTOs.Notifications;
using ContentCreation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ContentCreation.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;
    private readonly INotificationService _notificationService;

    public NotificationHub(
        ILogger<NotificationHub> logger,
        INotificationService notificationService)
    {
        _logger = logger;
        _notificationService = notificationService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            // Send initial notification stats on connection
            var stats = await _notificationService.GetUserStatsAsync(userId);
            await Clients.Caller.SendAsync("NotificationStats", stats);
            
            // Send unread notifications
            var unreadNotifications = await _notificationService.GetUserNotificationsAsync(new NotificationFilterDto
            {
                UserId = userId,
                Status = Core.Enums.NotificationStatus.Unread,
                PageSize = 10
            });
            
            await Clients.Caller.SendAsync("UnreadNotifications", unreadNotifications);
        }
        
        _logger.LogInformation("Client connected to NotificationHub: {ConnectionId}, User: {UserId}", 
            Context.ConnectionId, userId);
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected from NotificationHub: {ConnectionId}", 
            Context.ConnectionId);
        
        if (exception != null)
        {
            _logger.LogError(exception, "Client disconnected with error");
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    public async Task MarkAsRead(Guid notificationId)
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }
        
        var success = await _notificationService.MarkAsReadAsync(notificationId, userId);
        
        if (success)
        {
            // Send updated stats
            var stats = await _notificationService.GetUserStatsAsync(userId);
            await Clients.Caller.SendAsync("NotificationStats", stats);
            await Clients.Caller.SendAsync("NotificationMarkedRead", notificationId);
        }
        else
        {
            await Clients.Caller.SendAsync("Error", "Failed to mark notification as read");
        }
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    public async Task MarkAllAsRead(string? notificationType = null)
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }
        
        Core.Enums.NotificationType? type = null;
        if (!string.IsNullOrEmpty(notificationType) && 
            Enum.TryParse<Core.Enums.NotificationType>(notificationType, out var parsedType))
        {
            type = parsedType;
        }
        
        var count = await _notificationService.MarkAllAsReadAsync(new MarkAllReadDto
        {
            UserId = userId,
            Type = type
        });
        
        // Send updated stats
        var stats = await _notificationService.GetUserStatsAsync(userId);
        await Clients.Caller.SendAsync("NotificationStats", stats);
        await Clients.Caller.SendAsync("AllNotificationsMarkedRead", count);
    }

    /// <summary>
    /// Dismiss a notification
    /// </summary>
    public async Task DismissNotification(Guid notificationId)
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }
        
        var success = await _notificationService.MarkAsDismissedAsync(notificationId, userId);
        
        if (success)
        {
            await Clients.Caller.SendAsync("NotificationDismissed", notificationId);
        }
        else
        {
            await Clients.Caller.SendAsync("Error", "Failed to dismiss notification");
        }
    }

    /// <summary>
    /// Archive a notification
    /// </summary>
    public async Task ArchiveNotification(Guid notificationId)
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }
        
        var success = await _notificationService.ArchiveAsync(notificationId, userId);
        
        if (success)
        {
            await Clients.Caller.SendAsync("NotificationArchived", notificationId);
        }
        else
        {
            await Clients.Caller.SendAsync("Error", "Failed to archive notification");
        }
    }

    /// <summary>
    /// Get notification statistics
    /// </summary>
    public async Task GetStats()
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }
        
        var stats = await _notificationService.GetUserStatsAsync(userId);
        await Clients.Caller.SendAsync("NotificationStats", stats);
    }

    /// <summary>
    /// Get unread count
    /// </summary>
    public async Task GetUnreadCount()
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }
        
        var count = await _notificationService.GetUnreadCountAsync(userId);
        await Clients.Caller.SendAsync("UnreadCount", count);
    }

    /// <summary>
    /// Subscribe to project notifications
    /// </summary>
    public async Task SubscribeToProject(Guid projectId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"project-{projectId}");
        _logger.LogInformation("Client {ConnectionId} subscribed to project {ProjectId} notifications", 
            Context.ConnectionId, projectId);
        await Clients.Caller.SendAsync("SubscribedToProject", projectId);
    }

    /// <summary>
    /// Unsubscribe from project notifications
    /// </summary>
    public async Task UnsubscribeFromProject(Guid projectId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project-{projectId}");
        _logger.LogInformation("Client {ConnectionId} unsubscribed from project {ProjectId} notifications", 
            Context.ConnectionId, projectId);
        await Clients.Caller.SendAsync("UnsubscribedFromProject", projectId);
    }
}