using ContentCreation.Api.Features.Common.DTOs.Publishing;
using ContentCreation.Api.Features.Common.Entities;

namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IPublishingService
{
    Task<string?> PublishToSocialMedia(Post post, string platform, CancellationToken cancellationToken = default);
    Task<Dictionary<string, PublishResultDto>> PublishMultiPlatform(Post post, List<string> platforms, CancellationToken cancellationToken = default);
    Task<bool> TestConnectionAsync(string platform, CancellationToken cancellationToken = default);
    Task<PublishResultDto> PublishNowAsync(string postId, CancellationToken cancellationToken = default);
}