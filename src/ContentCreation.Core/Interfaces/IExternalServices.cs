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

public interface IPublishingService
{
    Task<string> PublishToSocialMedia(string platform, string content, List<string>? mediaUrls = null);
    Task<bool> ValidatePlatformCredentials(string platform);
}

public interface IPostService
{
    Task<PostDto> GetPostByIdAsync(string id);
    Task<List<PostDto>> GetPostsByProjectIdAsync(string projectId);
    Task<PostDto> CreatePostAsync(CreatePostDto dto);
    Task<PostDto> UpdatePostAsync(string id, UpdatePostDto dto);
    Task DeletePostAsync(string id);
    Task<PostDto> ApprovePostAsync(string id);
    Task<PostDto> RejectPostAsync(string id, string reason);
}

public class PostDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string? InsightId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = new();
    public List<string> MediaUrls { get; set; } = new();
    public string Status { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePostDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string? InsightId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = new();
    public List<string> MediaUrls { get; set; } = new();
}

public class UpdatePostDto
{
    public string? Content { get; set; }
    public List<string>? Hashtags { get; set; }
    public List<string>? MediaUrls { get; set; }
    public string? Status { get; set; }
}