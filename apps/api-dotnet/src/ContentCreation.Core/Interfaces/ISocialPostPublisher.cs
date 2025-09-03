using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces;

public interface ISocialPostPublisher
{
    Task PublishPostAsync(string projectId, string postId);
    Task PublishToLinkedInAsync(string postId);
    Task<bool> TestConnectionAsync(string platform);
    Task<string?> PublishToSocialMedia(Post post, string platform);
    Task<Dictionary<string, (bool Success, string? ExternalId, string? Error)>> PublishMultiPlatform(Post post, List<string> platforms);
}