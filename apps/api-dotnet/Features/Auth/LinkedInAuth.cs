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
    public record Request(string? ReturnUrl = null) : IRequest<Result>;
    
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
            var state = Guid.NewGuid().ToString("N");
            var scopes = "r_liteprofile r_emailaddress w_member_social";
            
            var authUrl = $"https://www.linkedin.com/oauth/v2/authorization?" +
                $"response_type=code&" +
                $"client_id={clientId}&" +
                $"redirect_uri={HttpUtility.UrlEncode(redirectUri)}&" +
                $"state={state}&" +
                $"scope={HttpUtility.UrlEncode(scopes)}";
            
            return Task.FromResult(Result.Success(authUrl));
        }
    }
}

// Handle LinkedIn OAuth callback
public static class HandleLinkedInCallback
{
    public record Request(string Code, string State) : IRequest<Result>;
    
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
        
        public Handler(IConfiguration configuration, ApplicationDbContext db, ILogger<Handler> logger)
        {
            _configuration = configuration;
            _db = db;
            _logger = logger;
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
                
                // Exchange code for token
                var client = new RestClient("https://www.linkedin.com/oauth/v2/");
                var tokenRequest = new RestRequest("accessToken", Method.Post);
                tokenRequest.AddParameter("grant_type", "authorization_code");
                tokenRequest.AddParameter("code", request.Code);
                tokenRequest.AddParameter("redirect_uri", redirectUri);
                tokenRequest.AddParameter("client_id", clientId);
                tokenRequest.AddParameter("client_secret", clientSecret);
                
                var response = await client.ExecuteAsync(tokenRequest, cancellationToken);
                if (!response.IsSuccessful || string.IsNullOrEmpty(response.Content))
                    return Result.Failure($"Failed to exchange code: {response.ErrorMessage}");
                
                var tokenData = JsonSerializer.Deserialize<LinkedInTokenResponse>(response.Content);
                if (tokenData == null || string.IsNullOrEmpty(tokenData.AccessToken))
                    return Result.Failure("Invalid token response");
                
                // Parse userId from state (or use a default for now)
                var userId = Guid.TryParse(request.State, out var id) ? id : Guid.NewGuid();
                
                // Store token
                var existingToken = await _db.OAuthTokens
                    .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == Common.Enums.SocialPlatform.LinkedIn, cancellationToken);
                
                if (existingToken != null)
                {
                    existingToken.UpdateToken(tokenData.AccessToken, tokenData.RefreshToken, 
                        tokenData.ExpiresIn.HasValue ? DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn.Value) : null);
                }
                else
                {
                    var newToken = new OAuthToken
                    {
                        UserId = userId,
                        Platform = Common.Enums.SocialPlatform.LinkedIn,
                        AccessTokenEncrypted = tokenData.AccessToken ?? string.Empty,
                        RefreshTokenEncrypted = tokenData.RefreshToken,
                        ExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn ?? 3600)
                    };
                    _db.OAuthTokens.Add(newToken);
                }
                
                await _db.SaveChangesAsync(cancellationToken);
                
                return Result.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling LinkedIn callback");
                return Result.Failure($"Error: {ex.Message}");
            }
        }
        
        private class LinkedInTokenResponse
        {
            public string AccessToken { get; set; } = string.Empty;
            public string? RefreshToken { get; set; }
            public int? ExpiresIn { get; set; }
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
        
        public Handler(ApplicationDbContext db)
        {
            _db = db;
        }
        
        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            var tokens = await _db.OAuthTokens
                .Where(t => t.UserId == request.UserId && t.Platform == Common.Enums.SocialPlatform.LinkedIn)
                .ToListAsync(cancellationToken);
            
            if (!tokens.Any())
                return Result.Failure("No LinkedIn connection found");
            
            _db.OAuthTokens.RemoveRange(tokens);
            await _db.SaveChangesAsync(cancellationToken);
            
            return Result.Success();
        }
    }
}