using Microsoft.EntityFrameworkCore;
using MediatR;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.BackgroundJobs;

/// <summary>
/// Background job that monitors OAuth tokens and refreshes those that are expiring soon
/// </summary>
public class RefreshOAuthTokensJob
{
    private readonly ApplicationDbContext _db;
    private readonly IMediator _mediator;
    private readonly ILogger<RefreshOAuthTokensJob> _logger;

    public RefreshOAuthTokensJob(ApplicationDbContext db, IMediator mediator, ILogger<RefreshOAuthTokensJob> logger)
    {
        _db = db;
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Process all OAuth tokens that are expiring within the next 7 days
    /// </summary>
    public async Task ProcessExpiringTokens()
    {
        try
        {
            _logger.LogInformation("Starting OAuth token refresh job");

            // Find tokens expiring in the next 7 days
            var expirationThreshold = DateTime.UtcNow.AddDays(7);
            var expiringTokens = await _db.OAuthTokens
                .Where(t => t.ExpiresAt != null && 
                           t.ExpiresAt < expirationThreshold &&
                           t.ExpiresAt > DateTime.UtcNow &&
                           !string.IsNullOrEmpty(t.RefreshTokenEncrypted))
                .ToListAsync();

            _logger.LogInformation("Found {Count} tokens expiring within 7 days", expiringTokens.Count);

            var refreshedCount = 0;
            var failedCount = 0;

            foreach (var token in expiringTokens)
            {
                try
                {
                    _logger.LogDebug("Attempting to refresh {Platform} token for user {UserId}", 
                        token.Platform, token.UserId);

                    var result = token.Platform switch
                    {
                        SocialPlatform.LinkedIn => await RefreshLinkedInToken(token.UserId),
                        // Add other platforms here as they're implemented
                        _ => throw new NotSupportedException($"Token refresh not implemented for platform {token.Platform}")
                    };

                    if (result)
                    {
                        refreshedCount++;
                        _logger.LogDebug("Successfully refreshed {Platform} token for user {UserId}", 
                            token.Platform, token.UserId);
                    }
                    else
                    {
                        failedCount++;
                        _logger.LogWarning("Failed to refresh {Platform} token for user {UserId}", 
                            token.Platform, token.UserId);
                    }
                }
                catch (Exception ex)
                {
                    failedCount++;
                    _logger.LogError(ex, "Error refreshing {Platform} token for user {UserId}", 
                        token.Platform, token.UserId);
                }

                // Add a small delay between token refresh attempts to avoid rate limiting
                await Task.Delay(1000);
            }

            _logger.LogInformation("OAuth token refresh job completed: {Refreshed} refreshed, {Failed} failed", 
                refreshedCount, failedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OAuth token refresh job");
            throw;
        }
    }

    /// <summary>
    /// Process tokens that have already expired and send notifications
    /// </summary>
    public async Task ProcessExpiredTokens()
    {
        try
        {
            _logger.LogInformation("Starting expired OAuth token cleanup job");

            // Find tokens that expired more than 1 day ago
            var expiredThreshold = DateTime.UtcNow.AddDays(-1);
            var expiredTokens = await _db.OAuthTokens
                .Where(t => t.ExpiresAt != null && t.ExpiresAt < expiredThreshold)
                .GroupBy(t => new { t.UserId, t.Platform })
                .Select(g => new { 
                    UserId = g.Key.UserId, 
                    Platform = g.Key.Platform,
                    Count = g.Count(),
                    OldestExpiry = g.Min(x => x.ExpiresAt)
                })
                .ToListAsync();

            if (expiredTokens.Any())
            {
                _logger.LogInformation("Found {Count} expired token groups to clean up", expiredTokens.Count);

                // Here you could send notifications to users about expired connections
                // For now, we'll just log them
                foreach (var expiredGroup in expiredTokens)
                {
                    _logger.LogInformation("User {UserId} has {Count} expired {Platform} tokens (oldest: {ExpiredAt})", 
                        expiredGroup.UserId, expiredGroup.Count, expiredGroup.Platform, expiredGroup.OldestExpiry);

                    // TODO: Send email notification to user about expired connection
                    // TODO: Create in-app notification for user to reconnect
                }
            }

            _logger.LogInformation("Expired OAuth token cleanup job completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in expired OAuth token cleanup job");
            throw;
        }
    }

    /// <summary>
    /// Refresh LinkedIn token using the Auth feature
    /// </summary>
    private async Task<bool> RefreshLinkedInToken(Guid userId)
    {
        try
        {
            var result = await _mediator.Send(new Auth.RefreshLinkedInToken.Request(userId));
            return result.IsSuccess;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling LinkedIn token refresh for user {UserId}", userId);
            return false;
        }
    }
}