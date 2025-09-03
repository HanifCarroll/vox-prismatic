namespace ContentCreation.Core.Interfaces;

public interface ILinkedInService
{
    string GetAuthorizationUrl(string redirectUri, string state);
    Task<OAuthTokenResponse> ExchangeCodeForTokenAsync(string code, string redirectUri);
    Task<OAuthTokenResponse> RefreshTokenAsync(string refreshToken);
    Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null);
    Task<bool> ValidateCredentialsAsync();
    Task<LinkedInProfile> GetProfileAsync();
}

public class OAuthTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
    public string Scope { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
}

public class LinkedInProfile
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public ProfileLocation Location { get; set; } = new();
    
    public class ProfileLocation
    {
        public string Country { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
    }
}