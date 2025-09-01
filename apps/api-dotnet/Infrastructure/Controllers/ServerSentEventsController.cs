using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Lib.AspNetCore.ServerSentEvents;
using ContentCreation.Api.Infrastructure.Hubs;

namespace ContentCreation.Api.Infrastructure.Controllers;

[ApiController]
[Route("sse")]
[Authorize]
public class ServerSentEventsController : ControllerBase
{
    private readonly IServerSentEventsService _sseService;
    private readonly ProjectProgressHub _progressHub;
    private readonly ILogger<ServerSentEventsController> _logger;

    public ServerSentEventsController(
        IServerSentEventsService sseService,
        ProjectProgressHub progressHub,
        ILogger<ServerSentEventsController> logger)
    {
        _sseService = sseService;
        _progressHub = progressHub;
        _logger = logger;
    }

    /// <summary>
    /// Subscribe to project-specific events
    /// </summary>
    [HttpGet("events/projects/{projectId}")]
    [Produces("text/event-stream")]
    public async Task SubscribeToProject(string projectId)
    {
        var clientId = Guid.NewGuid().ToString();
        var userId = User.Identity?.Name ?? "anonymous";
        
        _logger.LogInformation("Client {ClientId} (User: {UserId}) subscribing to project {ProjectId}", 
            clientId, userId, projectId);

        // Subscribe to project
        await _progressHub.SubscribeToProjectAsync(clientId, projectId);

        // Send initial connection event
        await _sseService.SendEventAsync(new ServerSentEvent
        {
            Type = "connection",
            Data = new List<string>
            {
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    clientId,
                    projectId,
                    connected = true,
                    timestamp = DateTime.UtcNow
                })
            }
        });

        // Keep connection alive
        Response.OnCompleted(async () =>
        {
            await _progressHub.UnsubscribeFromProjectAsync(clientId, projectId);
            _logger.LogInformation("Client {ClientId} disconnected from project {ProjectId}", 
                clientId, projectId);
        });
    }

    /// <summary>
    /// Subscribe to all events
    /// </summary>
    [HttpGet("events")]
    [Produces("text/event-stream")]
    public async Task SubscribeToAll()
    {
        var clientId = Guid.NewGuid().ToString();
        var userId = User.Identity?.Name ?? "anonymous";
        
        _logger.LogInformation("Client {ClientId} (User: {UserId}) subscribing to all events", 
            clientId, userId);

        // Send initial connection event
        await _sseService.SendEventAsync(new ServerSentEvent
        {
            Type = "connection",
            Data = new List<string>
            {
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    clientId,
                    connected = true,
                    timestamp = DateTime.UtcNow
                })
            }
        });

        // Send heartbeat every 30 seconds
        _ = Task.Run(async () =>
        {
            while (!HttpContext.RequestAborted.IsCancellationRequested)
            {
                await Task.Delay(30000);
                
                try
                {
                    await _sseService.SendEventAsync(new ServerSentEvent
                    {
                        Type = "heartbeat",
                        Data = new List<string>
                        {
                            System.Text.Json.JsonSerializer.Serialize(new
                            {
                                timestamp = DateTime.UtcNow
                            })
                        }
                    });
                }
                catch
                {
                    // Client disconnected
                    break;
                }
            }
        });

        Response.OnCompleted(() =>
        {
            _logger.LogInformation("Client {ClientId} disconnected", clientId);
            return Task.CompletedTask;
        });
    }

    /// <summary>
    /// Test SSE connection
    /// </summary>
    [HttpPost("test")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> TestSSE([FromBody] TestSSEDto dto)
    {
        try
        {
            if (dto.Type == "project")
            {
                await _progressHub.SendProjectUpdateAsync(dto.ProjectId!, new ProjectUpdateEvent
                {
                    EventType = "test",
                    Stage = "testing",
                    Progress = 50,
                    Message = dto.Message ?? "Test project update"
                });
            }
            else if (dto.Type == "global")
            {
                await _progressHub.SendGlobalNotificationAsync(new GlobalNotification
                {
                    Type = "info",
                    Message = dto.Message ?? "Test global notification",
                    DurationMs = 5000
                });
            }
            else if (dto.Type == "user")
            {
                var userId = User.Identity?.Name ?? "system";
                await _progressHub.SendUserNotificationAsync(userId, new UserNotification
                {
                    Type = "info",
                    Message = dto.Message ?? "Test user notification",
                    IsPersistent = false
                });
            }

            return Ok(new { success = true, message = "Test event sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending test SSE event");
            return StatusCode(500, new { error = "Failed to send test event" });
        }
    }
}

public class TestSSEDto
{
    public string Type { get; set; } = "global"; // "project", "global", "user"
    public string? ProjectId { get; set; }
    public string? Message { get; set; }
}