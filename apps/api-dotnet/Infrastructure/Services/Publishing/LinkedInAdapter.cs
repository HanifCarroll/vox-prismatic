using ContentCreation.Api.Features.Common.DTOs.Publishing;
using ContentCreation.Api.Features.Common.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Web;

namespace ContentCreation.Api.Infrastructure.Services.Publishing;

public class LinkedInAdapter : IPlatformAdapter
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LinkedInAdapter> _logger;
    
    private const string AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
    private const string TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
    private const string API_BASE = "https://api.linkedin.com/v2";
    private const string SHARE_API = "https://api.linkedin.com/rest/posts";
    
    public string PlatformName => "LinkedIn";

    public LinkedInAdapter(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LinkedInAdapter> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public string GetAuthorizationUrl(string? state = null)
    {
        var clientId = _configuration["LinkedIn:ClientId"];
        var redirectUri = _configuration["LinkedIn:RedirectUri"];
        var scope = "openid profile w_member_social r_basicprofile";
        
        var queryParams = HttpUtility.ParseQueryString(string.Empty);
        queryParams["response_type"] = "code";
        queryParams["client_id"] = clientId;
        queryParams["redirect_uri"] = redirectUri;
        queryParams["scope"] = scope;
        
        if (!string.IsNullOrEmpty(state))
            queryParams["state"] = state;
        
        return $"{AUTH_URL}?{queryParams}";
    }

    public async Task<PlatformTokenDto> ExchangeAuthCodeAsync(string code, string? redirectUri = null)
    {
        var clientId = _configuration["LinkedIn:ClientId"] ?? throw new InvalidOperationException("LinkedIn:ClientId not configured");
        var clientSecret = _configuration["LinkedIn:ClientSecret"] ?? throw new InvalidOperationException("LinkedIn:ClientSecret not configured");
        redirectUri ??= _configuration["LinkedIn:RedirectUri"] ?? throw new InvalidOperationException("LinkedIn:RedirectUri not configured");
        
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "authorization_code"),
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("redirect_uri", redirectUri),
            new KeyValuePair<string, string>("client_id", clientId),
            new KeyValuePair<string, string>("client_secret", clientSecret)
        });
        
        var response = await _httpClient.PostAsync(TOKEN_URL, content);
        var json = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("LinkedIn token exchange failed: {Response}", json);
            throw new InvalidOperationException($"Failed to exchange auth code: {json}");
        }
        
        var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
        
        return new PlatformTokenDto
        {
            Platform = PlatformName,
            AccessToken = tokenData.GetProperty("access_token").GetString() ?? "",
            RefreshToken = tokenData.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : null,
            ExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.GetProperty("expires_in").GetInt32()),
            TokenType = "Bearer",
            Scope = tokenData.TryGetProperty("scope", out var scope) ? scope.GetString() : null
        };
    }

    public Task<bool> RefreshTokenAsync()
    {
        // LinkedIn access tokens are valid for 60 days and don't support refresh
        // User must re-authenticate when token expires
        _logger.LogWarning("LinkedIn doesn't support token refresh. User must re-authenticate.");
        return Task.FromResult(false);
    }

    public Task<bool> RevokeAccessAsync()
    {
        try
        {
            var token = _configuration["LinkedIn:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return Task.FromResult(true);
            
            // LinkedIn doesn't have a revoke endpoint, but we can clear local storage
            // In production, you'd clear the token from your database
            _logger.LogInformation("LinkedIn access revoked locally");
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to revoke LinkedIn access");
            return Task.FromResult(false);
        }
    }

    public async Task<PlatformProfileDto?> GetProfileAsync()
    {
        try
        {
            var token = _configuration["LinkedIn:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return null;
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            // Get user profile
            var response = await _httpClient.GetAsync($"{API_BASE}/userinfo");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get LinkedIn profile: {StatusCode}", response.StatusCode);
                return null;
            }
            
            var json = await response.Content.ReadAsStringAsync();
            var profile = JsonSerializer.Deserialize<JsonElement>(json);
            
            return new PlatformProfileDto
            {
                Platform = PlatformName,
                ProfileId = profile.GetProperty("sub").GetString() ?? "",
                DisplayName = profile.GetProperty("name").GetString() ?? "",
                ProfileUrl = $"https://www.linkedin.com/in/{profile.GetProperty("sub").GetString()}",
                ImageUrl = profile.TryGetProperty("picture", out var pic) ? pic.GetString() : null,
                IsVerified = profile.TryGetProperty("email_verified", out var verified) && verified.GetBoolean(),
                ConnectedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get LinkedIn profile");
            return null;
        }
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            var profile = await GetProfileAsync();
            return profile != null;
        }
        catch
        {
            return false;
        }
    }

    public async Task<PlatformResultDto> PublishAsync(Post post)
    {
        try
        {
            var token = _configuration["LinkedIn:AccessToken"];
            if (string.IsNullOrEmpty(token))
            {
                return new PlatformResultDto
                {
                    Platform = PlatformName,
                    Success = false,
                    Error = "LinkedIn not authenticated"
                };
            }
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            // Get user URN (required for posting)
            var profileResponse = await _httpClient.GetAsync($"{API_BASE}/userinfo");
            if (!profileResponse.IsSuccessStatusCode)
            {
                return new PlatformResultDto
                {
                    Platform = PlatformName,
                    Success = false,
                    Error = "Failed to get user profile"
                };
            }
            
            var profileJson = await profileResponse.Content.ReadAsStringAsync();
            var profile = JsonSerializer.Deserialize<JsonElement>(profileJson);
            var userUrn = $"urn:li:person:{profile.GetProperty("sub").GetString()}";
            
            // Create post payload
            var postData = new
            {
                author = userUrn,
                lifecycleState = "PUBLISHED",
                specificContent = new
                {
                    shareCommentary = new
                    {
                        text = post.Content
                    }
                },
                visibility = "PUBLIC"
            };
            
            var json = JsonSerializer.Serialize(postData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            content.Headers.Add("X-Restli-Protocol-Version", "2.0.0");
            content.Headers.Add("LinkedIn-Version", "202401");
            
            var response = await _httpClient.PostAsync(SHARE_API, content);
            var responseContent = await response.Content.ReadAsStringAsync();
            
            if (response.IsSuccessStatusCode)
            {
                // Extract post ID from response headers
                var postId = response.Headers.TryGetValues("x-restli-id", out var ids) 
                    ? ids.FirstOrDefault() 
                    : Guid.NewGuid().ToString();
                
                return new PlatformResultDto
                {
                    Platform = PlatformName,
                    Success = true,
                    PostId = postId,
                    PostUrl = $"https://www.linkedin.com/feed/update/{postId}",
                    StatusCode = (int)response.StatusCode
                };
            }
            
            _logger.LogError("LinkedIn post failed: {Response}", responseContent);
            
            return new PlatformResultDto
            {
                Platform = PlatformName,
                Success = false,
                Error = $"Failed to publish: {responseContent}",
                StatusCode = (int)response.StatusCode
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish to LinkedIn");
            return new PlatformResultDto
            {
                Platform = PlatformName,
                Success = false,
                Error = ex.Message
            };
        }
    }

    public async Task<bool> DeletePostAsync(string postId)
    {
        try
        {
            var token = _configuration["LinkedIn:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return false;
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            var response = await _httpClient.DeleteAsync($"{SHARE_API}/{postId}");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete LinkedIn post {PostId}", postId);
            return false;
        }
    }

    public Task<string?> UploadMediaAsync(byte[] mediaData, string contentType)
    {
        // LinkedIn media upload is complex and requires multiple steps
        // This is a simplified placeholder
        _logger.LogWarning("LinkedIn media upload not fully implemented");
        return Task.FromResult<string?>(null);
    }

    public Task<Dictionary<string, object>?> GetPostAnalyticsAsync(string postId)
    {
        try
        {
            var token = _configuration["LinkedIn:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return Task.FromResult<Dictionary<string, object>?>(null);
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            // LinkedIn analytics require additional permissions and different endpoints
            // This is a placeholder
            var result = new Dictionary<string, object>
            {
                ["postId"] = postId,
                ["views"] = 0,
                ["likes"] = 0,
                ["comments"] = 0,
                ["shares"] = 0
            };
            return Task.FromResult<Dictionary<string, object>?>(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get LinkedIn analytics for post {PostId}", postId);
            return Task.FromResult<Dictionary<string, object>?>(null);
        }
    }

    public Dictionary<string, object> GetPlatformLimits()
    {
        return new Dictionary<string, object>
        {
            ["maxCharacters"] = 3000,
            ["maxHashtags"] = 30,
            ["maxMentions"] = 50,
            ["maxImages"] = 9,
            ["maxVideoSizeMB"] = 5120,
            ["supportedImageFormats"] = new[] { "jpg", "jpeg", "png", "gif" },
            ["supportedVideoFormats"] = new[] { "mp4", "avi", "mov" }
        };
    }

    public bool ValidateContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return false;
        
        if (content.Length > 3000)
            return false;
        
        // Count hashtags
        var hashtagCount = content.Count(c => c == '#');
        if (hashtagCount > 30)
            return false;
        
        return true;
    }
}