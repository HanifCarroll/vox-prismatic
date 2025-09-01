using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestSharp;
using RestSharp.Authenticators.OAuth;
using System.Text.Json;
using System.Web;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace ContentCreation.Infrastructure.Services;

public class TwitterService : ITwitterService
{
    private readonly ILogger<TwitterService> _logger;
    private readonly IConfiguration _configuration;
    private readonly RestClient _client;
    private readonly RestClient _authClient;
    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly string? _bearerToken;
    private string? _accessToken;
    private string? _refreshToken;
    private DateTime _tokenExpiry;
    private readonly SemaphoreSlim _rateLimitSemaphore;
    private DateTime _lastRequestTime;
    private int _requestCount;
    private const int MaxRequestsPerWindow = 300;
    private const int WindowMinutes = 15;

    public TwitterService(
        ILogger<TwitterService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _clientId = configuration["ApiKeys:Twitter:ClientId"] ?? configuration["X_CLIENT_ID"];
        _clientSecret = configuration["ApiKeys:Twitter:ClientSecret"] ?? configuration["X_CLIENT_SECRET"];
        _bearerToken = configuration["ApiKeys:Twitter:BearerToken"] ?? configuration["X_BEARER_TOKEN"];
        _accessToken = configuration["ApiKeys:Twitter:AccessToken"] ?? configuration["X_ACCESS_TOKEN"];
        
        _client = new RestClient("https://api.twitter.com/2/");
        _authClient = new RestClient("https://twitter.com/i/");
        _rateLimitSemaphore = new SemaphoreSlim(1, 1);
        _lastRequestTime = DateTime.UtcNow;
        _requestCount = 0;
        _tokenExpiry = DateTime.UtcNow.AddHours(2);
        
        if (string.IsNullOrEmpty(_bearerToken) && string.IsNullOrEmpty(_accessToken) && 
            (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret)))
        {
            throw new InvalidOperationException("Twitter credentials not configured. Provide BearerToken, AccessToken, or ClientId/ClientSecret");
        }
    }

    public string GetAuthorizationUrl(string redirectUri, string state, string codeChallenge)
    {
        if (string.IsNullOrEmpty(_clientId))
            throw new InvalidOperationException("Twitter Client ID not configured");
            
        var scopes = "tweet.read tweet.write users.read offline.access";
        var authUrl = $"https://twitter.com/i/oauth2/authorize?" +
            $"response_type=code&" +
            $"client_id={HttpUtility.UrlEncode(_clientId)}&" +
            $"redirect_uri={HttpUtility.UrlEncode(redirectUri)}&" +
            $"scope={HttpUtility.UrlEncode(scopes)}&" +
            $"state={HttpUtility.UrlEncode(state)}&" +
            $"code_challenge={HttpUtility.UrlEncode(codeChallenge)}&" +
            $"code_challenge_method=S256";
            
        _logger.LogInformation("Generated Twitter authorization URL");
        return authUrl;
    }

    public static string GenerateCodeChallenge(out string codeVerifier)
    {
        codeVerifier = GenerateRandomString(128);
        using var sha256 = SHA256.Create();
        var challengeBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(codeVerifier));
        return Convert.ToBase64String(challengeBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }

    private static string GenerateRandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, length)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    public async Task<TwitterOAuthTokenResponse> ExchangeCodeForTokenAsync(string code, string redirectUri, string codeVerifier)
    {
        if (string.IsNullOrEmpty(_clientId))
            throw new InvalidOperationException("Twitter OAuth credentials not configured");
            
        var request = new RestRequest("oauth2/token", Method.Post);
        request.AddHeader("Content-Type", "application/x-www-form-urlencoded");
        
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
        request.AddHeader("Authorization", $"Basic {credentials}");
        
        request.AddParameter("code", code);
        request.AddParameter("grant_type", "authorization_code");
        request.AddParameter("redirect_uri", redirectUri);
        request.AddParameter("code_verifier", codeVerifier);
        
        var response = await _authClient.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Failed to exchange Twitter code for token: {Error}", response.Content);
            throw new Exception($"OAuth token exchange failed: {response.Content}");
        }
        
        var tokenData = JsonSerializer.Deserialize<TwitterOAuthTokenResponse>(response.Content!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        if (tokenData != null)
        {
            _accessToken = tokenData.AccessToken;
            _refreshToken = tokenData.RefreshToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn);
            
            _logger.LogInformation("Successfully obtained Twitter access token");
        }
        
        return tokenData ?? new TwitterOAuthTokenResponse();
    }

    public async Task<TwitterOAuthTokenResponse> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
            throw new InvalidOperationException("Twitter OAuth credentials not configured");
            
        var request = new RestRequest("oauth2/token", Method.Post);
        request.AddHeader("Content-Type", "application/x-www-form-urlencoded");
        
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
        request.AddHeader("Authorization", $"Basic {credentials}");
        
        request.AddParameter("refresh_token", refreshToken);
        request.AddParameter("grant_type", "refresh_token");
        
        var response = await _authClient.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Failed to refresh Twitter token: {Error}", response.Content);
            throw new Exception($"Token refresh failed: {response.Content}");
        }
        
        var tokenData = JsonSerializer.Deserialize<TwitterOAuthTokenResponse>(response.Content!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        if (tokenData != null)
        {
            _accessToken = tokenData.AccessToken;
            _refreshToken = tokenData.RefreshToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn);
            
            _logger.LogInformation("Successfully refreshed Twitter access token");
        }
        
        return tokenData ?? new TwitterOAuthTokenResponse();
    }

    private async Task ApplyRateLimitingAsync()
    {
        await _rateLimitSemaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            if ((now - _lastRequestTime).TotalMinutes >= WindowMinutes)
            {
                _requestCount = 0;
                _lastRequestTime = now;
            }
            
            if (_requestCount >= MaxRequestsPerWindow)
            {
                var delayMs = (int)((WindowMinutes * 60000) - (now - _lastRequestTime).TotalMilliseconds);
                if (delayMs > 0)
                {
                    _logger.LogInformation("Rate limiting: waiting {Delay}ms before next Twitter request", delayMs);
                    await Task.Delay(delayMs);
                    _requestCount = 0;
                    _lastRequestTime = DateTime.UtcNow;
                }
            }
            
            _requestCount++;
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }

    private string GetAuthorizationHeader()
    {
        if (!string.IsNullOrEmpty(_accessToken))
        {
            if (DateTime.UtcNow >= _tokenExpiry.AddMinutes(-5))
            {
                _logger.LogWarning("Twitter access token expired");
                throw new InvalidOperationException("Twitter access token is expired. Please re-authenticate.");
            }
            return $"Bearer {_accessToken}";
        }
        else if (!string.IsNullOrEmpty(_bearerToken))
        {
            return $"Bearer {_bearerToken}";
        }
        else
        {
            throw new InvalidOperationException("No valid Twitter authentication available");
        }
    }

    public async Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null)
    {
        await ApplyRateLimitingAsync();
        
        _logger.LogInformation("Publishing post to Twitter/X with {CharCount} characters", content.Length);
        
        if (content.Length > 280)
        {
            _logger.LogWarning("Twitter post content exceeds 280 character limit, truncating");
            content = content.Substring(0, 277) + "...";
        }
        
        var request = new RestRequest("tweets", Method.Post);
        request.AddHeader("Authorization", GetAuthorizationHeader());
        request.AddHeader("Content-Type", "application/json");
        
        object body;
        
        if (mediaUrls != null && mediaUrls.Any())
        {
            var mediaIds = await UploadMediaAsync(mediaUrls);
            body = new
            {
                text = content,
                media = new
                {
                    media_ids = mediaIds.Take(4).ToArray()
                }
            };
        }
        else
        {
            body = new
            {
                text = content
            };
        }
        
        request.AddJsonBody(body);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Twitter post failed with status {Status}: {Error}", response.StatusCode, response.Content);
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var resetTime = response.Headers?.FirstOrDefault(h => h.Name == "x-rate-limit-reset")?.Value?.ToString();
                throw new Exception($"Twitter rate limit exceeded. Resets at: {resetTime}");
            }
            else if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                throw new Exception("Twitter authentication failed. Please re-authenticate.");
            }
            
            throw new Exception($"Twitter post failed: {response.Content}");
        }
        
        var result = JsonSerializer.Deserialize<TwitterPostResponse>(response.Content!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        var tweetId = result?.Data?.Id;
        
        _logger.LogInformation("Successfully published to Twitter with ID: {TweetId}", tweetId);
        return tweetId ?? "unknown";
    }

    public async Task<bool> ValidateCredentialsAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(_bearerToken) && string.IsNullOrEmpty(_accessToken))
                return false;
                
            await ApplyRateLimitingAsync();
            
            var request = new RestRequest("users/me", Method.Get);
            request.AddHeader("Authorization", GetAuthorizationHeader());
            
            var response = await _client.ExecuteAsync(request);
            
            if (response.IsSuccessful)
            {
                _logger.LogInformation("Twitter credentials validated successfully");
                return true;
            }
            
            _logger.LogWarning("Twitter credential validation failed: {Status}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate Twitter credentials");
            return false;
        }
    }

    public async Task<TwitterUser> GetUserProfileAsync()
    {
        await ApplyRateLimitingAsync();
        
        var request = new RestRequest("users/me", Method.Get);
        request.AddHeader("Authorization", GetAuthorizationHeader());
        request.AddQueryParameter("user.fields", "id,name,username,profile_image_url,created_at,verified");
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception($"Failed to get Twitter profile: {response.Content}");
        }
        
        var result = JsonSerializer.Deserialize<TwitterUserResponse>(response.Content!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        return result?.Data ?? new TwitterUser();
    }

    private async Task<List<string>> UploadMediaAsync(List<string> mediaUrls)
    {
        var mediaIds = new List<string>();
        var uploadClient = new RestClient("https://upload.twitter.com/1.1/");
        
        foreach (var mediaUrl in mediaUrls.Take(4))
        {
            try
            {
                using var httpClient = new HttpClient();
                var mediaBytes = await httpClient.GetByteArrayAsync(mediaUrl);
                
                var request = new RestRequest("media/upload.json", Method.Post);
                request.AddHeader("Authorization", GetAuthorizationHeader());
                request.AddFile("media", mediaBytes, "image.jpg", "multipart/form-data");
                
                var response = await uploadClient.ExecuteAsync(request);
                
                if (response.IsSuccessful)
                {
                    dynamic result = JsonSerializer.Deserialize<dynamic>(response.Content!)!;
                    var mediaId = result.GetProperty("media_id_string").GetString();
                    if (!string.IsNullOrEmpty(mediaId))
                    {
                        mediaIds.Add(mediaId);
                    }
                }
                else
                {
                    _logger.LogError("Failed to upload media to Twitter: {Error}", response.Content);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload media: {Url}", mediaUrl);
            }
        }
        
        return mediaIds;
    }
}

public class TwitterPostResponse
{
    public TwitterPostData? Data { get; set; }
}

public class TwitterPostData
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
}

public class TwitterOAuthTokenResponse
{
    public string TokenType { get; set; } = "bearer";
    public int ExpiresIn { get; set; }
    public string AccessToken { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
}

public class TwitterUser
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool Verified { get; set; }
}

public class TwitterUserResponse
{
    public TwitterUser? Data { get; set; }
}