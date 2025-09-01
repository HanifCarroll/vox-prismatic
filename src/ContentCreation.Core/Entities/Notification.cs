using ContentCreation.Core.Enums;

namespace ContentCreation.Core.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationPriority Priority { get; set; }
    public NotificationStatus Status { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public string? MetadataJson { get; set; } // Store metadata as JSON
    public Guid? ProjectId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? DismissedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    // Navigation property
    public ContentProject? Project { get; set; }
}