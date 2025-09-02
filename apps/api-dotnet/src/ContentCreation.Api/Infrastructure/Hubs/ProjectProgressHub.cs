using ContentCreation.Core.Interfaces;
using Lib.AspNetCore.ServerSentEvents;

namespace ContentCreation.Api.Infrastructure.Hubs;

public class ProjectProgressHub : IProjectProgressHub
{
	private readonly IServerSentEventsService _sseService;
	private readonly ILogger<ProjectProgressHub> _logger;
	private readonly Dictionary<string, List<string>> _projectSubscriptions = new();
	private readonly Dictionary<string, List<string>> _userSubscriptions = new();
	private readonly SemaphoreSlim _subscriptionLock = new(1, 1);

	public ProjectProgressHub(
		IServerSentEventsService sseService,
		ILogger<ProjectProgressHub> logger)
	{
		_sseService = sseService;
		_logger = logger;
	}

	public async Task SendProjectUpdateAsync(string projectId, ProjectUpdateEvent updateEvent)
	{
		try
		{
			var eventData = new ServerSentEvent
			{
				Id = Guid.NewGuid().ToString(),
				Type = "project-update",
				Data = new List<string> 
				{ 
					System.Text.Json.JsonSerializer.Serialize(new
					{
						projectId,
						timestamp = DateTime.UtcNow,
						data = updateEvent
					})
				}
			};

			// Send to all clients subscribed to this project
			await SendToProjectSubscribersAsync(projectId, eventData);
			
			_logger.LogDebug("Sent project update for project {ProjectId}", projectId);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error sending project update for project {ProjectId}", projectId);
		}
	}

	public async Task SendPipelineEventAsync(string projectId, PipelineEvent pipelineEvent)
	{
		try
		{
			var eventData = new ServerSentEvent
			{
				Id = Guid.NewGuid().ToString(),
				Type = "pipeline-event",
				Data = new List<string>
				{
					System.Text.Json.JsonSerializer.Serialize(new
					{
						projectId,
						timestamp = DateTime.UtcNow,
						data = pipelineEvent
					})
				}
			};

			await SendToProjectSubscribersAsync(projectId, eventData);
			
			_logger.LogDebug("Sent pipeline event {EventType} for project {ProjectId}", 
				pipelineEvent.EventType, projectId);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error sending pipeline event for project {ProjectId}", projectId);
		}
	}

	public async Task SendGlobalNotificationAsync(GlobalNotification notification)
	{
		try
		{
			var eventData = new ServerSentEvent
			{
				Id = Guid.NewGuid().ToString(),
				Type = "global-notification",
				Data = new List<string>
				{
					System.Text.Json.JsonSerializer.Serialize(new
					{
						timestamp = DateTime.UtcNow,
						data = notification
					})
				}
			};

			await _sseService.SendEventAsync(eventData);
			
			_logger.LogInformation("Sent global notification: {Message}", notification.Message);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error sending global notification");
		}
	}

	public async Task SendUserNotificationAsync(string userId, UserNotification notification)
	{
		try
		{
			var eventData = new ServerSentEvent
			{
				Id = Guid.NewGuid().ToString(),
				Type = "user-notification",
				Data = new List<string>
				{
					System.Text.Json.JsonSerializer.Serialize(new
					{
						userId,
						timestamp = DateTime.UtcNow,
						data = notification
					})
				}
			};

			await SendToUserSubscribersAsync(userId, eventData);
			
			_logger.LogDebug("Sent notification to user {UserId}: {Message}", 
				userId, notification.Message);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error sending notification to user {UserId}", userId);
		}
	}

	private async Task SendToProjectSubscribersAsync(string projectId, ServerSentEvent eventData)
	{
		await _subscriptionLock.WaitAsync();
		try
		{
			if (_projectSubscriptions.TryGetValue(projectId, out var clientIds))
			{
				foreach (var clientId in clientIds.ToList())
				{
					var client = await _sseService.GetClientAsync(clientId);
					if (client != null)
					{
						await _sseService.SendEventAsync(eventData, client);
					}
					else
					{
						// Remove disconnected client
						clientIds.Remove(clientId);
					}
				}
			}
		}
		finally
		{
			_subscriptionLock.Release();
		}
	}

	private async Task SendToUserSubscribersAsync(string userId, ServerSentEvent eventData)
	{
		await _subscriptionLock.WaitAsync();
		try
		{
			if (_userSubscriptions.TryGetValue(userId, out var clientIds))
			{
				foreach (var clientId in clientIds.ToList())
				{
					var client = await _sseService.GetClientAsync(clientId);
					if (client != null)
					{
						await _sseService.SendEventAsync(eventData, client);
					}
					else
					{
						// Remove disconnected client
						clientIds.Remove(clientId);
					}
				}
			}
		}
		finally
		{
			_subscriptionLock.Release();
		}
	}

	public async Task SubscribeToProjectAsync(string clientId, string projectId)
	{
		await _subscriptionLock.WaitAsync();
		try
		{
			if (!_projectSubscriptions.ContainsKey(projectId))
			{
				_projectSubscriptions[projectId] = new List<string>();
			}
			
			if (!_projectSubscriptions[projectId].Contains(clientId))
			{
				_projectSubscriptions[projectId].Add(clientId);
				_logger.LogDebug("Client {ClientId} subscribed to project {ProjectId}", 
					clientId, projectId);
			}
		}
		finally
		{
			_subscriptionLock.Release();
		}
	}

	public async Task UnsubscribeFromProjectAsync(string clientId, string projectId)
	{
		await _subscriptionLock.WaitAsync();
		try
		{
			if (_projectSubscriptions.TryGetValue(projectId, out var clientIds))
			{
				clientIds.Remove(clientId);
				if (clientIds.Count == 0)
				{
					_projectSubscriptions.Remove(projectId);
				}
				
				_logger.LogDebug("Client {ClientId} unsubscribed from project {ProjectId}", 
					clientId, projectId);
			}
		}
		finally
		{
			_subscriptionLock.Release();
		}
	}
}

