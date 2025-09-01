using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Infrastructure.Services;

public class PublishingService : IPublishingService
{
    private readonly ILogger<PublishingService> _logger;
    private readonly ILinkedInService _linkedInService;
    private readonly ITwitterService _twitterService;

    public PublishingService(
        ILogger<PublishingService> logger,
        ILinkedInService linkedInService,
        ITwitterService twitterService)
    {
        _logger = logger;
        _linkedInService = linkedInService;
        _twitterService = twitterService;
    }

    public async Task<string> PublishToSocialMedia(string platform, string content, List<string>? mediaUrls = null)
    {
        _logger.LogInformation("Publishing to {Platform}", platform);
        
        return platform.ToLower() switch
        {
            "linkedin" => await _linkedInService.PublishPostAsync(content, mediaUrls),
            "twitter" or "x" => await _twitterService.PublishPostAsync(content, mediaUrls),
            _ => throw new NotSupportedException($"Platform {platform} is not supported")
        };
    }

    public async Task<bool> ValidatePlatformCredentials(string platform)
    {
        _logger.LogInformation("Validating credentials for {Platform}", platform);
        
        return platform.ToLower() switch
        {
            "linkedin" => await _linkedInService.ValidateCredentialsAsync(),
            "twitter" or "x" => await _twitterService.ValidateCredentialsAsync(),
            _ => false
        };
    }
}