namespace ContentCreation.Core.Interfaces;

public interface IDeepgramService
{
    Task<string> TranscribeAudioAsync(string audioUrl);
}

public interface ILinkedInService
{
    Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null);
    Task<bool> ValidateCredentialsAsync();
}

public interface IOAuthTokenStore
{
    Task StoreAsync(string userId, string platform, string accessToken, string? refreshToken, DateTime? expiresAt);
    Task<(string AccessToken, string? RefreshToken, DateTime? ExpiresAt)?> GetAsync(string userId, string platform);
    Task RemoveAsync(string userId, string platform);
}

public interface IProjectEventPublisher
{
    Task PublishProjectUpdateAsync(string projectId, string eventType, string stage, int progress, string? message = null, Dictionary<string, object>? data = null);
}

public interface ITwitterService
{
    Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null);
    Task<bool> ValidateCredentialsAsync();
}