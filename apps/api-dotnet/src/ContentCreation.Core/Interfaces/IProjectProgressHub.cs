namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IProjectProgressHub
{
    Task SendProjectUpdateAsync(string projectId, ProjectUpdateEvent updateEvent);
    Task SendPipelineEventAsync(string projectId, PipelineEvent pipelineEvent);
    Task SendGlobalNotificationAsync(GlobalNotification notification);
    Task SendUserNotificationAsync(string userId, UserNotification notification);
    Task SubscribeToProjectAsync(string clientId, string projectId);
    Task UnsubscribeFromProjectAsync(string clientId, string projectId);
}

// Event DTOs
public class ProjectUpdateEvent
{
    public string EventType { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public int Progress { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}

public class PipelineEvent
{
    public string EventType { get; set; } = string.Empty;
    public string PipelineStage { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class GlobalNotification
{
    public string Type { get; set; } = string.Empty; // "info", "warning", "error", "success"
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public int? DurationMs { get; set; } = 5000;
}

public class UserNotification
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ProjectId { get; set; }
    public string? EntityId { get; set; }
    public string? EntityType { get; set; }
    public string? ActionUrl { get; set; }
    public bool IsPersistent { get; set; }
}