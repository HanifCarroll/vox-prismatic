using ContentCreation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestSharp;
using System.Text.Json;
using System.Web;
using System.Net;
using System.Text;

namespace ContentCreation.Infrastructure.Services;

public class LinkedInService : ILinkedInService
{
    private readonly ILogger<LinkedInService> _logger;
    private readonly IConfiguration _configuration;
    private readonly RestClient _client;
    private readonly RestClient _authClient;
    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly IOAuthTokenStore _tokenStore;
    private string? _accessToken;
    private DateTime _tokenExpiry;
    private readonly SemaphoreSlim _rateLimitSemaphore;
    private DateTime _lastRequestTime;
    private int _requestCount;
    private const int MaxRequestsPerMinute = 100;

    public LinkedInService(
        ILogger<LinkedInService> logger,
        IConfiguration configuration,
        IOAuthTokenStore tokenStore)
    {
        _logger = logger;
        _configuration = configuration;
        _tokenStore = tokenStore;
        _clientId = configuration["ApiKeys:LinkedIn:ClientId"];
        _clientSecret = configuration["ApiKeys:LinkedIn:ClientSecret"];
        _accessToken = configuration["ApiKeys:LinkedIn:AccessToken"] ?? configuration["LINKEDIN_ACCESS_TOKEN"];
        
        _client = new RestClient("https://api.linkedin.com/v2/");
        _authClient = new RestClient("https://www.linkedin.com/oauth/v2/");
        _rateLimitSemaphore = new SemaphoreSlim(1, 1);
        _lastRequestTime = DateTime.UtcNow;
        _requestCount = 0;
        _tokenExpiry = DateTime.UtcNow.AddHours(2);
        
        if (string.IsNullOrEmpty(_accessToken) && (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret)))
        {
            throw new InvalidOperationException("LinkedIn credentials not configured. Provide either AccessToken or ClientId/ClientSecret");
        }
    }

    public string GetAuthorizationUrl(string redirectUri, string state)
    {
        if (string.IsNullOrEmpty(_clientId))
            throw new InvalidOperationException("LinkedIn Client ID not configured");
            
        var scopes = "r_liteprofile r_emailaddress w_member_social";
        var authUrl = $"https://www.linkedin.com/oauth/v2/authorization?" +
            $"response_type=code&" +
            $"client_id={HttpUtility.UrlEncode(_clientId)}&" +
            $"redirect_uri={HttpUtility.UrlEncode(redirectUri)}&" +
            $"state={HttpUtility.UrlEncode(state)}&" +
            $"scope={HttpUtility.UrlEncode(scopes)}";
            
        _logger.LogInformation("Generated LinkedIn authorization URL");
        return authUrl;
    }

    public async Task<OAuthTokenResponse> ExchangeCodeForTokenAsync(string code, string redirectUri)
    {
        if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
            throw new InvalidOperationException("LinkedIn OAuth credentials not configured");
            
        var request = new RestRequest("accessToken", Method.Post);
        request.AddHeader("Content-Type", "application/x-www-form-urlencoded");
        
        request.AddParameter("grant_type", "authorization_code");
        request.AddParameter("code", code);
        request.AddParameter("redirect_uri", redirectUri);
        request.AddParameter("client_id", _clientId);
        request.AddParameter("client_secret", _clientSecret);
        
        var response = await _authClient.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Failed to exchange LinkedIn code for token: {Error}", response.Content);
            throw new Exception($"OAuth token exchange failed: {response.Content}");
        }
        
        var tokenData = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content!);
        
        if (tokenData != null)
        {
            _accessToken = tokenData.AccessToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn);
            _logger.LogInformation("Successfully obtained LinkedIn access token");
        }
        
        return new OAuthTokenResponse
        {
            AccessToken = tokenData?.AccessToken ?? string.Empty,
            ExpiresIn = tokenData?.ExpiresIn ?? 0,
            RefreshToken = tokenData?.RefreshToken,
            Scope = tokenData?.Scope ?? string.Empty
        };
    }

    public async Task<OAuthTokenResponse> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
            throw new InvalidOperationException("LinkedIn OAuth credentials not configured");
            
        var request = new RestRequest("accessToken", Method.Post);
        request.AddHeader("Content-Type", "application/x-www-form-urlencoded");
        
        request.AddParameter("grant_type", "refresh_token");
        request.AddParameter("refresh_token", refreshToken);
        request.AddParameter("client_id", _clientId);
        request.AddParameter("client_secret", _clientSecret);
        
        var response = await _authClient.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Failed to refresh LinkedIn token: {Error}", response.Content);
            throw new Exception($"Token refresh failed: {response.Content}");
        }
        
        var tokenData = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content!);
        
        if (tokenData != null)
        {
            _accessToken = tokenData.AccessToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn);
            _logger.LogInformation("Successfully refreshed LinkedIn access token");
        }
        
        return new OAuthTokenResponse
        {
            AccessToken = tokenData?.AccessToken ?? string.Empty,
            ExpiresIn = tokenData?.ExpiresIn ?? 0,
            RefreshToken = tokenData?.RefreshToken,
            Scope = tokenData?.Scope ?? string.Empty
        };
    }

    private async Task EnsureValidTokenAsync()
    {
        if (string.IsNullOrEmpty(_accessToken) || DateTime.UtcNow >= _tokenExpiry.AddMinutes(-5))
        {
            // Attempt to load from token store (single-user/system for now; extend with userId later)
            var stored = await _tokenStore.GetAsync("system", "linkedin");
            if (stored.HasValue)
            {
                _accessToken = stored.Value.AccessToken;
                _tokenExpiry = stored.Value.ExpiresAt ?? DateTime.UtcNow.AddHours(1);
            }
        }
        if (string.IsNullOrEmpty(_accessToken) || DateTime.UtcNow >= _tokenExpiry.AddMinutes(-5))
        {
            _logger.LogWarning("LinkedIn access token expired or missing");
            throw new InvalidOperationException("LinkedIn access token is expired or not available. Please re-authenticate.");
        }
    }

    private async Task ApplyRateLimitingAsync()
    {
        await _rateLimitSemaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            if ((now - _lastRequestTime).TotalMinutes >= 1)
            {
                _requestCount = 0;
                _lastRequestTime = now;
            }
            
            if (_requestCount >= MaxRequestsPerMinute)
            {
                var delayMs = (int)(60000 - (now - _lastRequestTime).TotalMilliseconds);
                if (delayMs > 0)
                {
                    _logger.LogInformation("Rate limiting: waiting {Delay}ms before next LinkedIn request", delayMs);
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

    public async Task<string> PublishPostAsync(string content, List<string>? mediaUrls = null)
    {
        await EnsureValidTokenAsync();
        await ApplyRateLimitingAsync();
        
        _logger.LogInformation("Publishing post to LinkedIn with {CharCount} characters", content.Length);
        
        if (content.Length > 3000)
        {
            _logger.LogWarning("LinkedIn post content exceeds 3000 character limit, truncating");
            content = content.Substring(0, 2997) + "...";
        }
        
        var request = new RestRequest("ugcPosts", Method.Post);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        request.AddHeader("Content-Type", "application/json");
        request.AddHeader("X-Restli-Protocol-Version", "2.0.0");
        
        var authorUrn = await GetAuthorUrnAsync();
        
        object body;
        
        if (mediaUrls != null && mediaUrls.Any())
        {
            var mediaAssets = await UploadMediaAssetsAsync(mediaUrls);
            body = new
            {
                author = authorUrn,
                lifecycleState = "PUBLISHED",
                specificContent = new
                {
                    shareCommentary = new
                    {
                        text = content,
                        attributes = Array.Empty<object>()
                    },
                    shareMediaCategory = "IMAGE",
                    media = mediaAssets.Select(assetId => new
                    {
                        status = "READY",
                        media = assetId
                    }).ToArray()
                },
                visibility = new
                {
                    memberNetworkVisibility = "PUBLIC"
                }
            };
        }
        else
        {
            body = new
            {
                author = authorUrn,
                lifecycleState = "PUBLISHED",
                specificContent = new
                {
                    shareCommentary = new
                    {
                        text = content
                    },
                    shareMediaCategory = "NONE"
                },
                visibility = new
                {
                    memberNetworkVisibility = "PUBLIC"
                }
            };
        }
        
        request.AddJsonBody(body);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("LinkedIn post failed with status {Status}: {Error}", response.StatusCode, response.Content);
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                throw new Exception("LinkedIn rate limit exceeded. Please try again later.");
            }
            else if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                throw new Exception("LinkedIn authentication failed. Please re-authenticate.");
            }
            
            throw new Exception($"LinkedIn post failed: {response.Content}");
        }
        
        var postId = response.Headers?.FirstOrDefault(h => h.Name == "X-RestLi-Id")?.Value?.ToString();
        
        _logger.LogInformation("Successfully published to LinkedIn with ID: {PostId}", postId);
        return postId ?? "unknown";
    }

    public async Task<bool> ValidateCredentialsAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(_accessToken))
                return false;
                
            await ApplyRateLimitingAsync();
            
            var request = new RestRequest("me", Method.Get);
            request.AddHeader("Authorization", $"Bearer {_accessToken}");
            
            var response = await _client.ExecuteAsync(request);
            
            if (response.IsSuccessful)
            {
                _logger.LogInformation("LinkedIn credentials validated successfully");
                return true;
            }
            
            _logger.LogWarning("LinkedIn credential validation failed: {Status}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate LinkedIn credentials");
            return false;
        }
    }

    public async Task<LinkedInProfile> GetProfileAsync()
    {
        await EnsureValidTokenAsync();
        await ApplyRateLimitingAsync();
        
        var request = new RestRequest("me", Method.Get);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        request.AddQueryParameter("projection", "(id,firstName,lastName,profilePicture(displayImage~:playableStreams))");
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception($"Failed to get LinkedIn profile: {response.Content}");
        }
        
        var profile = JsonSerializer.Deserialize<LinkedInProfile>(response.Content!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        return profile ?? new LinkedInProfile();
    }

    private async Task<string> GetAuthorUrnAsync()
    {
        await ApplyRateLimitingAsync();
        
        var request = new RestRequest("me", Method.Get);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception($"Failed to get LinkedIn profile: {response.Content}");
        }
        
        var profile = JsonSerializer.Deserialize<LinkedInProfile>(response.Content!, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        return $"urn:li:person:{profile?.Id}";
    }

    private async Task<List<string>> UploadMediaAssetsAsync(List<string> mediaUrls)
    {
        var assetIds = new List<string>();
        
        foreach (var mediaUrl in mediaUrls.Take(4))
        {
            try
            {
                var assetId = await RegisterMediaUploadAsync();
                await UploadMediaToLinkedInAsync(assetId, mediaUrl);
                assetIds.Add(assetId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload media asset: {Url}", mediaUrl);
            }
        }
        
        return assetIds;
    }

    private async Task<string> RegisterMediaUploadAsync()
    {
        await ApplyRateLimitingAsync();
        
        var authorUrn = await GetAuthorUrnAsync();
        
        var request = new RestRequest("assets?action=registerUpload", Method.Post);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        request.AddHeader("Content-Type", "application/json");
        
        var body = new
        {
            registerUploadRequest = new
            {
                recipes = new[] { "urn:li:digitalmediaRecipe:feedshare-image" },
                owner = authorUrn,
                serviceRelationships = new[]
                {
                    new
                    {
                        relationshipType = "OWNER",
                        identifier = "urn:li:userGeneratedContent"
                    }
                }
            }
        };
        
        request.AddJsonBody(body);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception($"Failed to register media upload: {response.Content}");
        }
        
        dynamic result = JsonSerializer.Deserialize<dynamic>(response.Content!)!;
        return result.GetProperty("value").GetProperty("asset").GetString()!;
    }

    private async Task UploadMediaToLinkedInAsync(string assetId, string mediaUrl)
    {
        using var httpClient = new HttpClient();
        var mediaBytes = await httpClient.GetByteArrayAsync(mediaUrl);
        
        var uploadUrl = await GetUploadUrlAsync(assetId);
        
        var request = new RestRequest(uploadUrl, Method.Put);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        request.AddHeader("Content-Type", "application/octet-stream");
        request.AddParameter("application/octet-stream", mediaBytes, ParameterType.RequestBody);
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception($"Failed to upload media: {response.Content}");
        }
    }

    private async Task<string> GetUploadUrlAsync(string assetId)
    {
        await ApplyRateLimitingAsync();
        
        var request = new RestRequest($"assets/{assetId}", Method.Get);
        request.AddHeader("Authorization", $"Bearer {_accessToken}");
        
        var response = await _client.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            throw new Exception($"Failed to get upload URL: {response.Content}");
        }
        
        dynamic result = JsonSerializer.Deserialize<dynamic>(response.Content!)!;
        return result.GetProperty("uploadMechanism")
            .GetProperty("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest")
            .GetProperty("uploadUrl").GetString()!;
    }
}

public class LinkedInProfile
{
    public string Id { get; set; } = string.Empty;
    public LocalizedName? FirstName { get; set; }
    public LocalizedName? LastName { get; set; }
    public ProfilePictureData? ProfilePicture { get; set; }
    
    public class LocalizedName
    {
        public Dictionary<string, string> Localized { get; set; } = new();
        public PreferredLocale? PreferredLocale { get; set; }
    }
    
    public class PreferredLocale
    {
        public string Country { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
    }
    
    public class ProfilePictureData
    {
        public DisplayImage? DisplayImage { get; set; }
    }
    
    public class DisplayImage
    {
        public List<Element> Elements { get; set; } = new();
    }
    
    public class Element
    {
        public List<IdentifierData> Identifiers { get; set; } = new();
    }
    
    public class IdentifierData
    {
        public string Identifier { get; set; } = string.Empty;
    }
}

public class LinkedInTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public string? RefreshToken { get; set; }
    public string Scope { get; set; } = string.Empty;
}

public class OAuthTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public string? RefreshToken { get; set; }
    public string Scope { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
}