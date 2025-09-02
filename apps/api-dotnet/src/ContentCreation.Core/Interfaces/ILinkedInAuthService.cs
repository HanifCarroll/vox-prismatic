using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces;

public interface ILinkedInAuthService
{
    Task<string> GetAuthorizationUrlAsync(string redirectUri, string state);
    Task<OAuthToken> ExchangeCodeForTokenAsync(string code, string redirectUri, string userId);
    Task<OAuthToken?> GetValidTokenAsync(string userId);
    Task<bool> RefreshTokenAsync(string userId);
    Task RevokeTokenAsync(string userId);
    Task<bool> ValidateTokenAsync(string userId);
    Task<DateTime?> GetTokenExpiryAsync(string userId);
}