using ContentCreation.Core.Interfaces;

namespace ContentCreation.Infrastructure.Services;

public class ProjectEventPublisher : IProjectEventPublisher
{
    private readonly IProjectProgressHub _hub;

    public ProjectEventPublisher(IProjectProgressHub hub)
    {
        _hub = hub;
    }

    public async Task PublishProjectUpdateAsync(string projectId, string eventType, string stage, int progress, string? message = null, Dictionary<string, object>? data = null)
    {
        await _hub.SendProjectUpdateAsync(projectId, new ProjectUpdateEvent
        {
            EventType = eventType,
            Stage = stage,
            Progress = progress,
            Message = message,
            Data = data
        });
    }
}


