using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationPriority Priority { get; set; }
    public NotificationStatus Status { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public Guid? ProjectId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? DismissedAt { get; set; }
}

public class CreateNotificationDto
{
    public string UserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public Guid? ProjectId { get; set; }
}

public class BroadcastNotificationDto
{
    public NotificationType Type { get; set; }
    public NotificationPriority Priority { get; set; } = NotificationPriority.Normal;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public List<string>? UserIds { get; set; } // If null, broadcast to all users
}

public class NotificationFilterDto
{
    public string? UserId { get; set; }
    public NotificationType? Type { get; set; }
    public NotificationPriority? Priority { get; set; }
    public NotificationStatus? Status { get; set; }
    public Guid? ProjectId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class MarkNotificationReadDto
{
    public Guid NotificationId { get; set; }
    public string UserId { get; set; } = string.Empty;
}

public class MarkAllReadDto
{
    public string UserId { get; set; } = string.Empty;
    public NotificationType? Type { get; set; }
}

public class NotificationStatsDto
{
    public string UserId { get; set; } = string.Empty;
    public int TotalUnread { get; set; }
    public int TotalRead { get; set; }
    public int HighPriorityUnread { get; set; }
    public int UrgentUnread { get; set; }
    public Dictionary<string, int> UnreadByType { get; set; } = new();
    public DateTime? LastNotificationAt { get; set; }
}

public class RealTimeAlertDto
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationPriority Priority { get; set; }
    public int DurationMs { get; set; } = 5000; // How long to show the alert
    public bool RequiresAction { get; set; }
    public string? ActionLabel { get; set; }
    public string? ActionUrl { get; set; }
}