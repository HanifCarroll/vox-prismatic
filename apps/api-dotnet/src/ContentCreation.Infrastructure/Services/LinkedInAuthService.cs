using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RestSharp;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Web;

namespace ContentCreation.Infrastructure.Services;

public class LinkedInAuthService : ILinkedInAuthService
{
    private readonly ILogger<LinkedInAuthService> _logger;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly RestClient _authClient;
    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly string _encryptionKey;

    public LinkedInAuthService(
        ILogger<LinkedInAuthService> logger,
        IConfiguration configuration,
        ApplicationDbContext context)
    {
        _logger = logger;
        _configuration = configuration;
        _context = context;
        _clientId = configuration["ApiKeys:LinkedIn:ClientId"];
        _clientSecret = configuration["ApiKeys:LinkedIn:ClientSecret"];
        _encryptionKey = configuration["Security:EncryptionKey"] ?? GenerateDefaultKey();
        
        _authClient = new RestClient("https://www.linkedin.com/oauth/v2/");
        
        if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
        {
            _logger.LogWarning("LinkedIn OAuth credentials not configured");
        }
    }

    public async Task<string> GetAuthorizationUrlAsync(string redirectUri, string state)
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
            
        return await Task.FromResult(authUrl);
    }

    public async Task<OAuthToken> ExchangeCodeForTokenAsync(string code, string redirectUri, string userId)
    {
        if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
            throw new InvalidOperationException("LinkedIn OAuth credentials not configured");

        var request = new RestRequest("accessToken", Method.Post);
        request.AddParameter("grant_type", "authorization_code");
        request.AddParameter("code", code);
        request.AddParameter("redirect_uri", redirectUri);
        request.AddParameter("client_id", _clientId);
        request.AddParameter("client_secret", _clientSecret);

        var response = await _authClient.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Failed to exchange code for token: {StatusCode} - {Content}", 
                response.StatusCode, response.Content);
            throw new InvalidOperationException($"Failed to exchange code for token: {response.StatusCode}");
        }

        var tokenResponse = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content!);
        if (tokenResponse == null)
        {
            throw new InvalidOperationException("Invalid token response from LinkedIn");
        }

        // Store the token
        var existingToken = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId.ToString() == userId && t.Platform == "linkedin");

        if (existingToken != null)
        {
            existingToken.AccessTokenEncrypted = EncryptToken(tokenResponse.AccessToken);
            existingToken.RefreshTokenEncrypted = tokenResponse.RefreshToken != null ? 
                EncryptToken(tokenResponse.RefreshToken) : null;
            existingToken.ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
            existingToken.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            existingToken = new OAuthToken
            {
                UserId = Guid.Parse(userId),
                Platform = "linkedin",
                AccessTokenEncrypted = EncryptToken(tokenResponse.AccessToken),
                RefreshTokenEncrypted = tokenResponse.RefreshToken != null ? 
                    EncryptToken(tokenResponse.RefreshToken) : null,
                ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.OAuthTokens.Add(existingToken);
        }

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Successfully exchanged code for LinkedIn token for user {UserId}", userId);
        
        return existingToken;
    }

    public async Task<OAuthToken?> GetValidTokenAsync(string userId)
    {
        var token = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId.ToString() == userId && t.Platform == "linkedin");

        if (token == null)
        {
            _logger.LogDebug("No LinkedIn token found for user {UserId}", userId);
            return null;
        }

        // Check if token is expired
        if (token.ExpiresAt.HasValue && token.ExpiresAt.Value <= DateTime.UtcNow)
        {
            _logger.LogInformation("LinkedIn token expired for user {UserId}, attempting refresh", userId);
            
            if (await RefreshTokenAsync(userId))
            {
                // Reload the refreshed token
                token = await _context.OAuthTokens
                    .FirstOrDefaultAsync(t => t.UserId.ToString() == userId && t.Platform == "linkedin");
            }
            else
            {
                _logger.LogWarning("Failed to refresh LinkedIn token for user {UserId}", userId);
                return null;
            }
        }

        return token;
    }

    public async Task<bool> RefreshTokenAsync(string userId)
    {
        var token = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId.ToString() == userId && t.Platform == "linkedin");

        if (token == null || string.IsNullOrEmpty(token.RefreshTokenEncrypted))
        {
            _logger.LogWarning("No refresh token available for user {UserId}", userId);
            return false;
        }

        try
        {
            var refreshToken = DecryptToken(token.RefreshTokenEncrypted);
            
            var request = new RestRequest("accessToken", Method.Post);
            request.AddParameter("grant_type", "refresh_token");
            request.AddParameter("refresh_token", refreshToken);
            request.AddParameter("client_id", _clientId);
            request.AddParameter("client_secret", _clientSecret);

            var response = await _authClient.ExecuteAsync(request);
            
            if (!response.IsSuccessful)
            {
                _logger.LogError("Failed to refresh token: {StatusCode} - {Content}", 
                    response.StatusCode, response.Content);
                return false;
            }

            var tokenResponse = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content!);
            if (tokenResponse == null)
            {
                return false;
            }

            // Update the token
            token.AccessTokenEncrypted = EncryptToken(tokenResponse.AccessToken);
            if (!string.IsNullOrEmpty(tokenResponse.RefreshToken))
            {
                token.RefreshTokenEncrypted = EncryptToken(tokenResponse.RefreshToken);
            }
            token.ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
            token.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Successfully refreshed LinkedIn token for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing LinkedIn token for user {UserId}", userId);
            return false;
        }
    }

    public async Task RevokeTokenAsync(string userId)
    {
        var token = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId.ToString() == userId && t.Platform == "linkedin");

        if (token != null)
        {
            _context.OAuthTokens.Remove(token);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Revoked LinkedIn token for user {UserId}", userId);
        }
    }

    public async Task<bool> ValidateTokenAsync(string userId)
    {
        var token = await GetValidTokenAsync(userId);
        return token != null;
    }

    public async Task<DateTime?> GetTokenExpiryAsync(string userId)
    {
        var token = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId.ToString() == userId && t.Platform == "linkedin");
        
        return token?.ExpiresAt;
    }

    private string EncryptToken(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        aes.IV = new byte[16];

        var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var msEncrypt = new MemoryStream();
        using var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write);
        using (var swEncrypt = new StreamWriter(csEncrypt))
        {
            swEncrypt.Write(plainText);
        }
        
        return Convert.ToBase64String(msEncrypt.ToArray());
    }

    private string DecryptToken(string cipherText)
    {
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        aes.IV = new byte[16];

        var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var msDecrypt = new MemoryStream(Convert.FromBase64String(cipherText));
        using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
        using var srDecrypt = new StreamReader(csDecrypt);
        
        return srDecrypt.ReadToEnd();
    }

    private string GenerateDefaultKey()
    {
        var key = Guid.NewGuid().ToString("N");
        _logger.LogWarning("Using default encryption key. Configure Security:EncryptionKey in production");
        return key;
    }

    private class LinkedInTokenResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string? RefreshToken { get; set; }
        public int ExpiresIn { get; set; }
    }
    
    // Additional methods for AuthController
    public string GetAuthorizationUrl(string? returnUrl = null)
    {
        var redirectUri = _configuration["ApiKeys:LinkedIn:RedirectUri"] ?? "http://localhost:5001/api/auth/linkedin/callback";
        var state = returnUrl ?? "/";
        
        return GetAuthorizationUrlAsync(redirectUri, state).GetAwaiter().GetResult();
    }
    
    public async Task<ContentCreation.Core.DTOs.Auth.LinkedInAuthResponse> HandleCallbackAsync(string code, string state)
    {
        try
        {
            var redirectUri = _configuration["ApiKeys:LinkedIn:RedirectUri"] ?? "http://localhost:5001/api/auth/linkedin/callback";
            var userId = "default"; // In production, get from current user context
            
            var token = await ExchangeCodeForTokenAsync(code, redirectUri, userId);
            
            return new ContentCreation.Core.DTOs.Auth.LinkedInAuthResponse
            {
                Success = true,
                AccessToken = DecryptToken(token.AccessTokenEncrypted),
                RefreshToken = token.RefreshTokenEncrypted != null ? DecryptToken(token.RefreshTokenEncrypted) : null,
                ExpiresAt = token.ExpiresAt,
                ProfileId = token.Platform,
                ProfileName = "LinkedIn User",
                ProfileUrl = "https://linkedin.com"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to handle LinkedIn callback");
            return new ContentCreation.Core.DTOs.Auth.LinkedInAuthResponse
            {
                Success = false,
                Error = ex.Message
            };
        }
    }
    
    public async Task<ContentCreation.Core.DTOs.Auth.LinkedInStatusResponse> GetConnectionStatusAsync()
    {
        try
        {
            var userId = "default"; // In production, get from current user context
            var token = await GetValidTokenAsync(userId);
            
            if (token != null)
            {
                return new ContentCreation.Core.DTOs.Auth.LinkedInStatusResponse
                {
                    IsConnected = true,
                    ProfileId = token.Platform,
                    ProfileName = "LinkedIn User",
                    ProfileUrl = "https://linkedin.com",
                    ConnectedAt = token.CreatedAt,
                    TokenExpiresAt = token.ExpiresAt
                };
            }
            
            return new ContentCreation.Core.DTOs.Auth.LinkedInStatusResponse
            {
                IsConnected = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get LinkedIn connection status");
            return new ContentCreation.Core.DTOs.Auth.LinkedInStatusResponse
            {
                IsConnected = false
            };
        }
    }
    
    public async Task<bool> RevokeAccessAsync()
    {
        try
        {
            var userId = "default"; // In production, get from current user context
            await RevokeTokenAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to revoke LinkedIn access");
            return false;
        }
    }
}