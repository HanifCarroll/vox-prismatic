using ContentCreation.Api.Features.Common.Interfaces;
using ContentCreation.Api.Features.Common.Entities;

namespace ContentCreation.Api.Features.Common;

/// <summary>
/// Minimal implementation of ISocialPostPublisher for vertical slice architecture.
/// Social post publishing will be handled by MediatR handlers.
/// </summary>
public class MinimalSocialPostPublisher : ISocialPostPublisher
{
    private readonly ILogger<MinimalSocialPostPublisher> _logger;

    public MinimalSocialPostPublisher(ILogger<MinimalSocialPostPublisher> logger)
    {
        _logger = logger;
    }

    public Task PublishPostAsync(string projectId, string postId)
    {
        _logger.LogInformation("Publishing post {PostId} from project {ProjectId} - stub", postId, projectId);
        return Task.CompletedTask;
    }

    public Task PublishToLinkedInAsync(string postId)
    {
        _logger.LogInformation("Publishing post {PostId} to LinkedIn - stub", postId);
        return Task.CompletedTask;
    }

    public Task<bool> TestConnectionAsync(string platform)
    {
        _logger.LogInformation("Testing connection to {Platform} - stub", platform);
        return Task.FromResult(true);
    }

    public Task<string?> PublishToSocialMedia(Post post, string platform)
    {
        _logger.LogInformation("Publishing post to {Platform} - stub", platform);
        return Task.FromResult<string?>("stub-post-id");
    }

    public Task<Dictionary<string, (bool Success, string? ExternalId, string? Error)>> PublishMultiPlatform(Post post, List<string> platforms)
    {
        _logger.LogInformation("Publishing to multiple platforms - stub");
        var results = new Dictionary<string, (bool, string?, string?)>();
        foreach (var platform in platforms)
        {
            results[platform] = (true, "stub-post-id", null);
        }
        return Task.FromResult(results);
    }
}

public class PublishResult
{
    public bool IsSuccess { get; set; }
    public string? PublishedUrl { get; set; }
    public string? Error { get; set; }
}