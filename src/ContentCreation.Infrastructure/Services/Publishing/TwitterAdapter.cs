using ContentCreation.Core.DTOs.Publishing;
using ContentCreation.Core.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Web;

namespace ContentCreation.Infrastructure.Services.Publishing;

public class TwitterAdapter : IPlatformAdapter
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TwitterAdapter> _logger;
    
    private const string AUTH_URL = "https://twitter.com/i/oauth2/authorize";
    private const string TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
    private const string API_BASE = "https://api.twitter.com/2";
    
    public string PlatformName => "X";

    public TwitterAdapter(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<TwitterAdapter> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public string GetAuthorizationUrl(string? state = null)
    {
        var clientId = _configuration["X:ClientId"];
        var redirectUri = _configuration["X:RedirectUri"];
        var scope = "tweet.read tweet.write users.read offline.access";
        
        // Generate code challenge for PKCE
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        
        // Store code verifier for later use (in production, store in database)
        // For now, we'll use configuration
        
        var queryParams = HttpUtility.ParseQueryString(string.Empty);
        queryParams["response_type"] = "code";
        queryParams["client_id"] = clientId;
        queryParams["redirect_uri"] = redirectUri;
        queryParams["scope"] = scope;
        queryParams["code_challenge"] = codeChallenge;
        queryParams["code_challenge_method"] = "S256";
        
        if (!string.IsNullOrEmpty(state))
            queryParams["state"] = state;
        
        return $"{AUTH_URL}?{queryParams}";
    }

    public async Task<PlatformTokenDto> ExchangeAuthCodeAsync(string code, string? redirectUri = null)
    {
        var clientId = _configuration["X:ClientId"];
        var clientSecret = _configuration["X:ClientSecret"];
        redirectUri ??= _configuration["X:RedirectUri"];
        
        // In production, retrieve the code verifier from storage
        var codeVerifier = "stored_code_verifier"; // Placeholder
        
        var authValue = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        
        _httpClient.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Basic", authValue);
        
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "authorization_code"),
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("redirect_uri", redirectUri),
            new KeyValuePair<string, string>("code_verifier", codeVerifier)
        });
        
        var response = await _httpClient.PostAsync(TOKEN_URL, content);
        var json = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Twitter token exchange failed: {Response}", json);
            throw new InvalidOperationException($"Failed to exchange auth code: {json}");
        }
        
        var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
        
        return new PlatformTokenDto
        {
            Platform = PlatformName,
            AccessToken = tokenData.GetProperty("access_token").GetString() ?? "",
            RefreshToken = tokenData.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : null,
            ExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.GetProperty("expires_in").GetInt32()),
            TokenType = tokenData.GetProperty("token_type").GetString() ?? "Bearer",
            Scope = tokenData.TryGetProperty("scope", out var scope) ? scope.GetString() : null
        };
    }

    public async Task<bool> RefreshTokenAsync()
    {
        try
        {
            var refreshToken = _configuration["X:RefreshToken"];
            var clientId = _configuration["X:ClientId"];
            var clientSecret = _configuration["X:ClientSecret"];
            
            if (string.IsNullOrEmpty(refreshToken))
                return false;
            
            var authValue = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Basic", authValue);
            
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "refresh_token"),
                new KeyValuePair<string, string>("refresh_token", refreshToken)
            });
            
            var response = await _httpClient.PostAsync(TOKEN_URL, content);
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
                
                // Store new tokens (in production, update in database)
                var newAccessToken = tokenData.GetProperty("access_token").GetString();
                var newRefreshToken = tokenData.TryGetProperty("refresh_token", out var refresh) 
                    ? refresh.GetString() 
                    : refreshToken;
                
                _logger.LogInformation("Twitter tokens refreshed successfully");
                return true;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh Twitter token");
            return false;
        }
    }

    public async Task<bool> RevokeAccessAsync()
    {
        try
        {
            var token = _configuration["X:AccessToken"];
            var clientId = _configuration["X:ClientId"];
            var clientSecret = _configuration["X:ClientSecret"];
            
            if (string.IsNullOrEmpty(token))
                return true;
            
            var authValue = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Basic", authValue);
            
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("token", token),
                new KeyValuePair<string, string>("token_type_hint", "access_token")
            });
            
            var response = await _httpClient.PostAsync("https://api.twitter.com/2/oauth2/revoke", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to revoke Twitter access");
            return false;
        }
    }

    public async Task<PlatformProfileDto?> GetProfileAsync()
    {
        try
        {
            var token = _configuration["X:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return null;
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            var response = await _httpClient.GetAsync($"{API_BASE}/users/me?user.fields=name,username,profile_image_url,verified,public_metrics");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get Twitter profile: {StatusCode}", response.StatusCode);
                return null;
            }
            
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);
            var user = data.GetProperty("data");
            
            return new PlatformProfileDto
            {
                Platform = PlatformName,
                ProfileId = user.GetProperty("id").GetString() ?? "",
                DisplayName = user.GetProperty("name").GetString() ?? "",
                ProfileUrl = $"https://twitter.com/{user.GetProperty("username").GetString()}",
                ImageUrl = user.TryGetProperty("profile_image_url", out var img) ? img.GetString() : null,
                IsVerified = user.TryGetProperty("verified", out var verified) && verified.GetBoolean(),
                FollowerCount = user.TryGetProperty("public_metrics", out var metrics) 
                    ? metrics.GetProperty("followers_count").GetInt32() 
                    : null,
                ConnectedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Twitter profile");
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
            var token = _configuration["X:AccessToken"];
            if (string.IsNullOrEmpty(token))
            {
                return new PlatformResultDto
                {
                    Platform = PlatformName,
                    Success = false,
                    Error = "Twitter/X not authenticated"
                };
            }
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            var tweetData = new
            {
                text = post.Content
            };
            
            var json = JsonSerializer.Serialize(tweetData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync($"{API_BASE}/tweets", content);
            var responseContent = await response.Content.ReadAsStringAsync();
            
            if (response.IsSuccessStatusCode)
            {
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                var tweetId = responseData.GetProperty("data").GetProperty("id").GetString();
                
                // Get username for URL
                var profileResponse = await _httpClient.GetAsync($"{API_BASE}/users/me");
                var profileJson = await profileResponse.Content.ReadAsStringAsync();
                var profileData = JsonSerializer.Deserialize<JsonElement>(profileJson);
                var username = profileData.GetProperty("data").GetProperty("username").GetString();
                
                return new PlatformResultDto
                {
                    Platform = PlatformName,
                    Success = true,
                    PostId = tweetId,
                    PostUrl = $"https://twitter.com/{username}/status/{tweetId}",
                    StatusCode = (int)response.StatusCode
                };
            }
            
            _logger.LogError("Twitter post failed: {Response}", responseContent);
            
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
            _logger.LogError(ex, "Failed to publish to Twitter");
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
            var token = _configuration["X:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return false;
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            var response = await _httpClient.DeleteAsync($"{API_BASE}/tweets/{postId}");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete Twitter post {PostId}", postId);
            return false;
        }
    }

    public async Task<string?> UploadMediaAsync(byte[] mediaData, string contentType)
    {
        try
        {
            var token = _configuration["X:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return null;
            
            // Twitter media upload requires v1.1 API and chunked upload for large files
            // This is a simplified version
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            // Media upload endpoint
            var uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
            
            var content = new MultipartFormDataContent();
            content.Add(new ByteArrayContent(mediaData), "media");
            
            var response = await _httpClient.PostAsync(uploadUrl, content);
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(json);
                return data.GetProperty("media_id_string").GetString();
            }
            
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload media to Twitter");
            return null;
        }
    }

    public async Task<Dictionary<string, object>?> GetPostAnalyticsAsync(string postId)
    {
        try
        {
            var token = _configuration["X:AccessToken"];
            if (string.IsNullOrEmpty(token))
                return null;
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", token);
            
            var response = await _httpClient.GetAsync(
                $"{API_BASE}/tweets/{postId}?tweet.fields=public_metrics");
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(json);
                var metrics = data.GetProperty("data").GetProperty("public_metrics");
                
                return new Dictionary<string, object>
                {
                    ["postId"] = postId,
                    ["impressions"] = metrics.GetProperty("impression_count").GetInt32(),
                    ["likes"] = metrics.GetProperty("like_count").GetInt32(),
                    ["retweets"] = metrics.GetProperty("retweet_count").GetInt32(),
                    ["replies"] = metrics.GetProperty("reply_count").GetInt32(),
                    ["quotes"] = metrics.GetProperty("quote_count").GetInt32()
                };
            }
            
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Twitter analytics for post {PostId}", postId);
            return null;
        }
    }

    public Dictionary<string, object> GetPlatformLimits()
    {
        return new Dictionary<string, object>
        {
            ["maxCharacters"] = 280,
            ["maxImages"] = 4,
            ["maxVideoSizeMB"] = 512,
            ["maxVideoDurationSeconds"] = 140,
            ["maxGifSizeMB"] = 15,
            ["supportedImageFormats"] = new[] { "jpg", "jpeg", "png", "gif", "webp" },
            ["supportedVideoFormats"] = new[] { "mp4", "mov" }
        };
    }

    public bool ValidateContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return false;
        
        // Twitter counts characters differently (URLs are always 23 chars)
        // This is a simplified check
        if (content.Length > 280)
            return false;
        
        return true;
    }

    private string GenerateCodeVerifier()
    {
        var bytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private string GenerateCodeChallenge(string codeVerifier)
    {
        using (var sha256 = SHA256.Create())
        {
            var challengeBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(codeVerifier));
            return Convert.ToBase64String(challengeBytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }
    }
}