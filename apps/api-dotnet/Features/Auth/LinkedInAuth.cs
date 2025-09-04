using MediatR;
using Microsoft.EntityFrameworkCore;
using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Data;
using RestSharp;
using System.Text.Json;
using System.Web;

namespace ContentCreation.Api.Features.Auth;

// Get LinkedIn authorization URL
public static class GetLinkedInAuthUrl
{
    public record Request(string? CodeChallenge = null, string? State = null) : IRequest<Result>;
    
    public record Result(bool IsSuccess, string? AuthUrl, string? Error = null)
    {
        public static Result Success(string authUrl) => new(true, authUrl);
        public static Result Failure(string error) => new(false, null, error);
    }
    
    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly IConfiguration _configuration;
        
        public Handler(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        
        public Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            var clientId = _configuration["ApiKeys:LinkedIn:ClientId"];
            if (string.IsNullOrEmpty(clientId))
                return Task.FromResult(Result.Failure("LinkedIn Client ID not configured"));
            
            var redirectUri = _configuration["ApiKeys:LinkedIn:RedirectUri"] ?? "http://localhost:5001/api/auth/linkedin/callback";
            var state = request.State ?? Guid.NewGuid().ToString("N");
            var scopes = "r_liteprofile r_emailaddress w_member_social";
            
            var authUrl = $"https://www.linkedin.com/oauth/v2/authorization?" +
                $"response_type=code&" +
                $"client_id={clientId}&" +
                $"redirect_uri={HttpUtility.UrlEncode(redirectUri)}&" +
                $"state={state}&" +
                $"scope={HttpUtility.UrlEncode(scopes)}";
            
            // Add PKCE parameters if provided
            if (!string.IsNullOrEmpty(request.CodeChallenge))
            {
                authUrl += $"&code_challenge={request.CodeChallenge}&code_challenge_method=S256";
            }
            
            return Task.FromResult(Result.Success(authUrl));
        }
    }
}

// Handle LinkedIn OAuth callback
public static class HandleLinkedInCallback
{
    public record Request(string Code, string State, string? CodeVerifier = null) : IRequest<Result>;
    
    public record Result(bool IsSuccess, string? Message = null, string? Error = null)
    {
        public static Result Success(string message = "LinkedIn authentication successful") => new(true, message);
        public static Result Failure(string error) => new(false, null, error);
    }
    
    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _db;
        private readonly ILogger<Handler> _logger;
        private readonly Services.ICurrentUserService _currentUserService;
        
        public Handler(IConfiguration configuration, ApplicationDbContext db, ILogger<Handler> logger, Services.ICurrentUserService currentUserService)
        {
            _configuration = configuration;
            _db = db;
            _logger = logger;
            _currentUserService = currentUserService;
        }
        
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                var clientId = _configuration["ApiKeys:LinkedIn:ClientId"];
                var clientSecret = _configuration["ApiKeys:LinkedIn:ClientSecret"];
                var redirectUri = _configuration["ApiKeys:LinkedIn:RedirectUri"] ?? "http://localhost:5001/api/auth/linkedin/callback";
                
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
                    return Result.Failure("LinkedIn OAuth not configured");
                
                // Get current user ID from authentication context
                var userId = _currentUserService.GetUserId();
                if (!userId.HasValue)
                {
                    return Result.Failure("User authentication required for OAuth connection");
                }
                
                // Exchange code for token
                var client = new RestClient("https://www.linkedin.com/oauth/v2/");
                var tokenRequest = new RestRequest("accessToken", Method.Post);
                tokenRequest.AddHeader("Content-Type", "application/x-www-form-urlencoded");
                
                tokenRequest.AddParameter("grant_type", "authorization_code");
                tokenRequest.AddParameter("code", request.Code);
                tokenRequest.AddParameter("redirect_uri", redirectUri);
                tokenRequest.AddParameter("client_id", clientId);
                tokenRequest.AddParameter("client_secret", clientSecret);
                
                // Add PKCE code verifier if provided
                if (!string.IsNullOrEmpty(request.CodeVerifier))
                {
                    tokenRequest.AddParameter("code_verifier", request.CodeVerifier);
                }
                
                var response = await client.ExecuteAsync(tokenRequest, cancellationToken);
                if (!response.IsSuccessful || string.IsNullOrEmpty(response.Content))
                {
                    var errorMessage = response.Content ?? response.ErrorMessage ?? "Unknown error";
                    _logger.LogError("LinkedIn token exchange failed: {StatusCode} - {Content}", response.StatusCode, errorMessage);
                    return Result.Failure($"Failed to exchange authorization code: {errorMessage}");
                }
                
                var tokenData = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
                });
                
                if (tokenData == null || string.IsNullOrEmpty(tokenData.AccessToken))
                {
                    _logger.LogError("Invalid LinkedIn token response: {Content}", response.Content);
                    return Result.Failure("Invalid token response from LinkedIn");
                }
                
                // Store or update token
                var existingToken = await _db.OAuthTokens
                    .FirstOrDefaultAsync(t => t.UserId == userId.Value && t.Platform == Common.Enums.SocialPlatform.LinkedIn, cancellationToken);
                
                if (existingToken != null)
                {
                    // Update existing token (note: we should add encryption here)
                    existingToken.UpdateToken(
                        tokenData.AccessToken, 
                        tokenData.RefreshToken, 
                        tokenData.ExpiresIn.HasValue ? DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn.Value) : DateTime.UtcNow.AddDays(60) // LinkedIn tokens typically last 60 days
                    );
                }
                else
                {
                    // Create new token (note: we should add encryption here)
                    var newToken = new OAuthToken
                    {
                        UserId = userId.Value,
                        Platform = Common.Enums.SocialPlatform.LinkedIn,
                        AccessTokenEncrypted = tokenData.AccessToken,
                        RefreshTokenEncrypted = tokenData.RefreshToken,
                        ExpiresAt = tokenData.ExpiresIn.HasValue ? DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn.Value) : DateTime.UtcNow.AddDays(60),
                        Scope = "r_liteprofile r_emailaddress w_member_social"
                    };
                    _db.OAuthTokens.Add(newToken);
                }
                
                await _db.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("LinkedIn OAuth connection successful for user {UserId}", userId.Value);
                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling LinkedIn callback for user {UserId}", _currentUserService.GetUserId());
                return Result.Failure($"Internal error occurred: {ex.Message}");
            }
        }
        
        private class LinkedInTokenResponse
        {
            public string AccessToken { get; set; } = string.Empty;
            public string? RefreshToken { get; set; }
            public int? ExpiresIn { get; set; }
            public string? TokenType { get; set; }
            public string? Scope { get; set; }
        }
    }
}

// Get LinkedIn connection status
public static class GetLinkedInStatus
{
    public record Request(Guid UserId) : IRequest<Result>;
    
    public record Result(bool IsConnected, DateTime? ExpiresAt);
    
    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _db;
        
        public Handler(ApplicationDbContext db)
        {
            _db = db;
        }
        
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            var token = await _db.OAuthTokens
                .Where(t => t.UserId == request.UserId && t.Platform == Common.Enums.SocialPlatform.LinkedIn)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            
            return new Result(
                token != null && token.ExpiresAt > DateTime.UtcNow,
                token?.ExpiresAt
            );
        }
    }
}

// Refresh LinkedIn access token
public static class RefreshLinkedInToken
{
    public record Request(Guid UserId) : IRequest<Result>;
    
    public record Result(bool IsSuccess, string? AccessToken = null, string? RefreshToken = null, DateTime? ExpiresAt = null, string? Error = null)
    {
        public static Result Success(string accessToken, string? refreshToken, DateTime expiresAt) => 
            new(true, accessToken, refreshToken, expiresAt);
        public static Result Failure(string error) => new(false, null, null, null, error);
    }
    
    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _configuration;
        private readonly ILogger<Handler> _logger;
        
        public Handler(ApplicationDbContext db, IConfiguration configuration, ILogger<Handler> logger)
        {
            _db = db;
            _configuration = configuration;
            _logger = logger;
        }
        
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                var token = await _db.OAuthTokens
                    .FirstOrDefaultAsync(t => t.UserId == request.UserId && t.Platform == Common.Enums.SocialPlatform.LinkedIn, cancellationToken);
                
                if (token == null)
                    return Result.Failure("No LinkedIn connection found");
                
                if (string.IsNullOrEmpty(token.RefreshTokenEncrypted))
                    return Result.Failure("No refresh token available - please reconnect your LinkedIn account");
                
                var clientId = _configuration["ApiKeys:LinkedIn:ClientId"];
                var clientSecret = _configuration["ApiKeys:LinkedIn:ClientSecret"];
                
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
                    return Result.Failure("LinkedIn OAuth not configured");
                
                // Use LinkedIn's token refresh endpoint
                var client = new RestClient("https://www.linkedin.com/oauth/v2/");
                var tokenRequest = new RestRequest("accessToken", Method.Post);
                tokenRequest.AddHeader("Content-Type", "application/x-www-form-urlencoded");
                
                tokenRequest.AddParameter("grant_type", "refresh_token");
                tokenRequest.AddParameter("refresh_token", token.RefreshTokenEncrypted);
                tokenRequest.AddParameter("client_id", clientId);
                tokenRequest.AddParameter("client_secret", clientSecret);
                
                var response = await client.ExecuteAsync(tokenRequest, cancellationToken);
                if (!response.IsSuccessful || string.IsNullOrEmpty(response.Content))
                {
                    var errorMessage = response.Content ?? response.ErrorMessage ?? "Unknown error";
                    _logger.LogWarning("LinkedIn token refresh failed for user {UserId}: {StatusCode} - {Content}", 
                        request.UserId, response.StatusCode, errorMessage);
                    return Result.Failure($"Failed to refresh token: {errorMessage}");
                }
                
                var tokenData = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
                });
                
                if (tokenData == null || string.IsNullOrEmpty(tokenData.AccessToken))
                {
                    _logger.LogError("Invalid LinkedIn refresh token response for user {UserId}: {Content}", 
                        request.UserId, response.Content);
                    return Result.Failure("Invalid token response from LinkedIn");
                }
                
                // Update token with new values
                var expiresAt = tokenData.ExpiresIn.HasValue ? 
                    DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn.Value) : 
                    DateTime.UtcNow.AddDays(60);
                
                token.UpdateToken(
                    tokenData.AccessToken,
                    tokenData.RefreshToken ?? token.RefreshTokenEncrypted, // Keep existing refresh token if new one not provided
                    expiresAt
                );
                
                await _db.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("LinkedIn token refreshed successfully for user {UserId}", request.UserId);
                return Result.Success(tokenData.AccessToken, tokenData.RefreshToken, expiresAt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing LinkedIn token for user {UserId}", request.UserId);
                return Result.Failure($"Internal error occurred: {ex.Message}");
            }
        }
        
        private class LinkedInTokenResponse
        {
            public string AccessToken { get; set; } = string.Empty;
            public string? RefreshToken { get; set; }
            public int? ExpiresIn { get; set; }
            public string? TokenType { get; set; }
            public string? Scope { get; set; }
        }
    }
}

// Revoke LinkedIn access
public static class RevokeLinkedInAccess
{
    public record Request(Guid UserId) : IRequest<Result>;
    
    public record Result(bool IsSuccess, string? Message = null)
    {
        public static Result Success() => new(true, "LinkedIn connection revoked");
        public static Result Failure(string message) => new(false, message);
    }
    
    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<Handler> _logger;
        
        public Handler(ApplicationDbContext db, ILogger<Handler> logger)
        {
            _db = db;
            _logger = logger;
        }
        
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                var tokens = await _db.OAuthTokens
                    .Where(t => t.UserId == request.UserId && t.Platform == Common.Enums.SocialPlatform.LinkedIn)
                    .ToListAsync(cancellationToken);
                
                if (!tokens.Any())
                    return Result.Failure("No LinkedIn connection found");
                
                _db.OAuthTokens.RemoveRange(tokens);
                await _db.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("LinkedIn connection revoked for user {UserId}", request.UserId);
                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking LinkedIn access for user {UserId}", request.UserId);
                return Result.Failure($"Internal error occurred: {ex.Message}");
            }
        }
    }
}