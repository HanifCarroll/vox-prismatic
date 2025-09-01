using ContentCreation.Core.DTOs.Publishing;
using ContentCreation.Core.Entities;

namespace ContentCreation.Infrastructure.Services.Publishing;

public interface IPlatformAdapter
{
    string PlatformName { get; }
    
    // OAuth & Authentication
    string GetAuthorizationUrl(string? state = null);
    Task<PlatformTokenDto> ExchangeAuthCodeAsync(string code, string? redirectUri = null);
    Task<bool> RefreshTokenAsync();
    Task<bool> RevokeAccessAsync();
    Task<PlatformProfileDto?> GetProfileAsync();
    Task<bool> TestConnectionAsync();
    
    // Publishing
    Task<PlatformResultDto> PublishAsync(Post post);
    Task<bool> DeletePostAsync(string postId);
    
    // Media
    Task<string?> UploadMediaAsync(byte[] mediaData, string contentType);
    
    // Analytics
    Task<Dictionary<string, object>?> GetPostAnalyticsAsync(string postId);
    
    // Platform-specific
    Dictionary<string, object> GetPlatformLimits();
    bool ValidateContent(string content);
}