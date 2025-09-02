using ContentCreation.Core.DTOs.Notifications;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationService notificationService,
        ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

    /// <summary>
    /// Get user notifications with filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications(
        [FromQuery] NotificationType? type = null,
        [FromQuery] NotificationPriority? priority = null,
        [FromQuery] NotificationStatus? status = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var filter = new NotificationFilterDto
        {
            UserId = GetUserId(),
            Type = type,
            Priority = priority,
            Status = status,
            ProjectId = projectId,
            Page = page,
            PageSize = pageSize
        };

        var notifications = await _notificationService.GetUserNotificationsAsync(filter);
        return Ok(notifications);
    }

    /// <summary>
    /// Get notification by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<NotificationDto>> GetNotification(Guid id)
    {
        var notification = await _notificationService.GetByIdAsync(id);
        
        if (notification == null)
            return NotFound();
        
        // Verify user owns this notification
        if (notification.UserId != GetUserId())
            return Forbid();
        
        return Ok(notification);
    }

    /// <summary>
    /// Create a new notification (admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<NotificationDto>> CreateNotification([FromBody] CreateNotificationDto dto)
    {
        var notification = await _notificationService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetNotification), new { id = notification.Id }, notification);
    }

    /// <summary>
    /// Broadcast notification to multiple users (admin only)
    /// </summary>
    [HttpPost("broadcast")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> BroadcastNotification([FromBody] BroadcastNotificationDto dto)
    {
        await _notificationService.BroadcastAsync(dto);
        return Ok(new { message = "Notification broadcast successfully" });
    }

    /// <summary>
    /// Mark notification as read
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var success = await _notificationService.MarkAsReadAsync(id, GetUserId());
        
        if (!success)
            return NotFound();
        
        return Ok(new { message = "Notification marked as read" });
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPut("read-all")]
    public async Task<ActionResult> MarkAllAsRead([FromQuery] NotificationType? type = null)
    {
        var count = await _notificationService.MarkAllAsReadAsync(new MarkAllReadDto
        {
            UserId = GetUserId(),
            Type = type
        });
        
        return Ok(new { message = $"{count} notifications marked as read" });
    }

    /// <summary>
    /// Dismiss a notification
    /// </summary>
    [HttpPut("{id}/dismiss")]
    public async Task<IActionResult> DismissNotification(Guid id)
    {
        var success = await _notificationService.MarkAsDismissedAsync(id, GetUserId());
        
        if (!success)
            return NotFound();
        
        return Ok(new { message = "Notification dismissed" });
    }

    /// <summary>
    /// Archive a notification
    /// </summary>
    [HttpPut("{id}/archive")]
    public async Task<IActionResult> ArchiveNotification(Guid id)
    {
        var success = await _notificationService.ArchiveAsync(id, GetUserId());
        
        if (!success)
            return NotFound();
        
        return Ok(new { message = "Notification archived" });
    }

    /// <summary>
    /// Delete a notification
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(Guid id)
    {
        // Verify ownership first
        var notification = await _notificationService.GetByIdAsync(id);
        if (notification == null)
            return NotFound();
        
        if (notification.UserId != GetUserId())
            return Forbid();
        
        var success = await _notificationService.DeleteAsync(id);
        
        if (!success)
            return BadRequest();
        
        return Ok(new { message = "Notification deleted" });
    }

    /// <summary>
    /// Get notification statistics
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<NotificationStatsDto>> GetStats()
    {
        var stats = await _notificationService.GetUserStatsAsync(GetUserId());
        return Ok(stats);
    }

    /// <summary>
    /// Get unread count
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult> GetUnreadCount()
    {
        var count = await _notificationService.GetUnreadCountAsync(GetUserId());
        return Ok(new { count });
    }

    /// <summary>
    /// Get unread notifications by type
    /// </summary>
    [HttpGet("unread-by-type")]
    public async Task<ActionResult<Dictionary<NotificationType, int>>> GetUnreadByType()
    {
        var counts = await _notificationService.GetUnreadByTypeAsync(GetUserId());
        return Ok(counts);
    }

    /// <summary>
    /// Send test notification (development only)
    /// </summary>
    [HttpPost("test")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SendTestNotification()
    {
        var notification = new CreateNotificationDto
        {
            UserId = GetUserId(),
            Type = NotificationType.Info,
            Priority = NotificationPriority.Normal,
            Title = "Test Notification",
            Message = $"This is a test notification sent at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC",
            ActionUrl = "/notifications"
        };
        
        var created = await _notificationService.CreateAsync(notification);
        
        // Also send a real-time alert
        await _notificationService.SendRealTimeAlertAsync(GetUserId(), new RealTimeAlertDto
        {
            Title = "Test Alert",
            Message = "This is a test real-time alert",
            Type = NotificationType.Info,
            Priority = NotificationPriority.Normal,
            DurationMs = 5000
        });
        
        return Ok(new { message = "Test notification sent", notification = created });
    }

    /// <summary>
    /// Clean up old notifications (admin only)
    /// </summary>
    [HttpDelete("cleanup")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CleanupOldNotifications([FromQuery] int daysOld = 30)
    {
        var count = await _notificationService.DeleteOldNotificationsAsync(daysOld);
        return Ok(new { message = $"Deleted {count} notifications older than {daysOld} days" });
    }
}