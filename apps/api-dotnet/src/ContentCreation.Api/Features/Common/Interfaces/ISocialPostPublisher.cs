using ContentCreation.Api.Features.Common.Entities;

namespace ContentCreation.Api.Features.Common.Interfaces;

public interface ISocialPostPublisher
{
    Task PublishPostAsync(string projectId, string postId);
    Task PublishToLinkedInAsync(string postId);
    Task<bool> TestConnectionAsync(string platform);
    Task<string?> PublishToSocialMedia(Post post, string platform);
    Task<Dictionary<string, (bool Success, string? ExternalId, string? Error)>> PublishMultiPlatform(Post post, List<string> platforms);
}
