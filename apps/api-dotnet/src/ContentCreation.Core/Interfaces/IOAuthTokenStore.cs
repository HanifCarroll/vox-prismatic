namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IOAuthTokenStore
{
    Task StoreAsync(string userId, string platform, string accessToken, string? refreshToken, DateTime? expiresAt);
    Task<(string AccessToken, string? RefreshToken, DateTime? ExpiresAt)?> GetAsync(string userId, string platform);
    Task RemoveAsync(string userId, string platform);
}