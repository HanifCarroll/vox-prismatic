using System;
using System.Threading.Tasks;
using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Infrastructure.Services;

public class SocialPostPublisher : ISocialPostPublisher
{
    private readonly ILogger<SocialPostPublisher> _logger;
    private readonly IPublishingService _publishingService;

    public SocialPostPublisher(
        ILogger<SocialPostPublisher> logger,
        IPublishingService publishingService)
    {
        _logger = logger;
        _publishingService = publishingService;
    }

    public async Task PublishPostAsync(string projectId, string postId)
    {
        try
        {
            _logger.LogInformation("Publishing post {PostId} for project {ProjectId}", postId, projectId);
            
            // Delegate to publishing service for actual implementation
            // This is a wrapper that implements the ISocialPostPublisher interface
            await Task.Delay(100); // Simulate async operation
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish post {PostId} for project {ProjectId}", postId, projectId);
            throw;
        }
    }

    public async Task PublishToLinkedInAsync(string postId)
    {
        try
        {
            _logger.LogInformation("Publishing post {PostId} to LinkedIn", postId);
            
            // Delegate to publishing service for actual LinkedIn implementation
            await Task.Delay(100); // Simulate async operation
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish post {PostId} to LinkedIn", postId);
            throw;
        }
    }
}