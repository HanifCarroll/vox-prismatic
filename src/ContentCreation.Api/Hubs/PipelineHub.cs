using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ContentCreation.Core.DTOs.Pipeline;
using ContentCreation.Core.Enums;

namespace ContentCreation.Api.Hubs;

[Authorize]
public class PipelineHub : Hub
{
    private readonly ILogger<PipelineHub> _logger;

    public PipelineHub(ILogger<PipelineHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Client subscribes to pipeline updates for a specific project
    /// </summary>
    public async Task SubscribeToProject(Guid projectId)
    {
        var groupName = GetProjectGroup(projectId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} subscribed to project {ProjectId}", 
            Context.ConnectionId, projectId);
        
        await Clients.Caller.SendAsync("SubscriptionConfirmed", new
        {
            projectId,
            message = $"Subscribed to pipeline updates for project {projectId}"
        });
    }

    /// <summary>
    /// Client unsubscribes from pipeline updates for a specific project
    /// </summary>
    public async Task UnsubscribeFromProject(Guid projectId)
    {
        var groupName = GetProjectGroup(projectId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} unsubscribed from project {ProjectId}", 
            Context.ConnectionId, projectId);
    }

    /// <summary>
    /// Send pipeline status update to all clients subscribed to a project
    /// </summary>
    public async Task SendPipelineUpdate(Guid projectId, PipelineStatusDto status)
    {
        var groupName = GetProjectGroup(projectId);
        await Clients.Group(groupName).SendAsync("PipelineStatusUpdate", status);
        _logger.LogDebug("Sent pipeline update for project {ProjectId} to group {GroupName}", 
            projectId, groupName);
    }

    /// <summary>
    /// Send pipeline progress update
    /// </summary>
    public async Task SendProgressUpdate(Guid projectId, PipelineStage stage, int percentage, string message)
    {
        var groupName = GetProjectGroup(projectId);
        await Clients.Group(groupName).SendAsync("PipelineProgress", new
        {
            projectId,
            stage = stage.ToString(),
            percentage,
            message,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Send pipeline completion notification
    /// </summary>
    public async Task SendPipelineCompleted(Guid projectId, PipelineResultDto result)
    {
        var groupName = GetProjectGroup(projectId);
        await Clients.Group(groupName).SendAsync("PipelineCompleted", result);
        _logger.LogInformation("Sent pipeline completion for project {ProjectId}", projectId);
    }

    /// <summary>
    /// Send pipeline error notification
    /// </summary>
    public async Task SendPipelineError(Guid projectId, string error, PipelineStage failedStage)
    {
        var groupName = GetProjectGroup(projectId);
        await Clients.Group(groupName).SendAsync("PipelineError", new
        {
            projectId,
            error,
            failedStage = failedStage.ToString(),
            timestamp = DateTime.UtcNow
        });
        _logger.LogError("Sent pipeline error for project {ProjectId}: {Error}", projectId, error);
    }

    /// <summary>
    /// Send review required notification
    /// </summary>
    public async Task SendReviewRequired(Guid projectId, PipelineStage stage, string reviewType)
    {
        var groupName = GetProjectGroup(projectId);
        await Clients.Group(groupName).SendAsync("ReviewRequired", new
        {
            projectId,
            stage = stage.ToString(),
            reviewType,
            message = $"Review required for {reviewType} at {stage} stage",
            timestamp = DateTime.UtcNow
        });
        _logger.LogInformation("Sent review required notification for project {ProjectId} at stage {Stage}", 
            projectId, stage);
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}, User: {UserId}", 
            Context.ConnectionId, Context.UserIdentifier);
        
        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = Context.ConnectionId,
            message = "Connected to Pipeline Hub"
        });
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}, User: {UserId}", 
            Context.ConnectionId, Context.UserIdentifier);
        
        if (exception != null)
        {
            _logger.LogError(exception, "Client disconnected with error");
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    private static string GetProjectGroup(Guid projectId) => $"project-{projectId}";
}

/// <summary>
/// Extension methods for sending pipeline updates via SignalR from services
/// </summary>
public static class PipelineHubExtensions
{
    public static async Task SendPipelineUpdateAsync(
        this IHubContext<PipelineHub> hubContext,
        Guid projectId,
        PipelineStatusDto status)
    {
        var groupName = $"project-{projectId}";
        await hubContext.Clients.Group(groupName).SendAsync("PipelineStatusUpdate", status);
    }

    public static async Task SendProgressUpdateAsync(
        this IHubContext<PipelineHub> hubContext,
        Guid projectId,
        PipelineStage stage,
        int percentage,
        string message)
    {
        var groupName = $"project-{projectId}";
        await hubContext.Clients.Group(groupName).SendAsync("PipelineProgress", new
        {
            projectId,
            stage = stage.ToString(),
            percentage,
            message,
            timestamp = DateTime.UtcNow
        });
    }

    public static async Task SendPipelineCompletedAsync(
        this IHubContext<PipelineHub> hubContext,
        Guid projectId,
        PipelineResultDto result)
    {
        var groupName = $"project-{projectId}";
        await hubContext.Clients.Group(groupName).SendAsync("PipelineCompleted", result);
    }

    public static async Task SendPipelineErrorAsync(
        this IHubContext<PipelineHub> hubContext,
        Guid projectId,
        string error,
        PipelineStage failedStage)
    {
        var groupName = $"project-{projectId}";
        await hubContext.Clients.Group(groupName).SendAsync("PipelineError", new
        {
            projectId,
            error,
            failedStage = failedStage.ToString(),
            timestamp = DateTime.UtcNow
        });
    }

    public static async Task SendReviewRequiredAsync(
        this IHubContext<PipelineHub> hubContext,
        Guid projectId,
        PipelineStage stage,
        string reviewType)
    {
        var groupName = $"project-{projectId}";
        await hubContext.Clients.Group(groupName).SendAsync("ReviewRequired", new
        {
            projectId,
            stage = stage.ToString(),
            reviewType,
            message = $"Review required for {reviewType} at {stage} stage",
            timestamp = DateTime.UtcNow
        });
    }
}