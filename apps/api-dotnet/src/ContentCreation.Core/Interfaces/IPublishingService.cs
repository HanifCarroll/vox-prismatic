using ContentCreation.Core.DTOs.Publishing;
using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces;

public interface IPublishingService
{
    Task<string?> PublishToSocialMedia(Post post, string platform, CancellationToken cancellationToken = default);
    Task<Dictionary<string, PublishResultDto>> PublishMultiPlatform(Post post, List<string> platforms, CancellationToken cancellationToken = default);
    Task<bool> TestConnectionAsync(string platform, CancellationToken cancellationToken = default);
    Task<PublishResultDto> PublishNowAsync(string postId, CancellationToken cancellationToken = default);
}