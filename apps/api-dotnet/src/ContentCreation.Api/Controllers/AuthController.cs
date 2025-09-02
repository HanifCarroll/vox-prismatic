using ContentCreation.Core.DTOs.Auth;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly LinkedInService _linkedInService;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private static readonly Dictionary<string, OAuthState> _oauthStates = new();
    private readonly IOAuthTokenStore _tokenStore;
    private readonly IAuthService _authService;

    public AuthController(
        ILogger<AuthController> logger,
        ILinkedInService linkedInService,
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor,
        IOAuthTokenStore tokenStore,
        IAuthService authService)
    {
        _logger = logger;
        _linkedInService = (LinkedInService)linkedInService;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _tokenStore = tokenStore;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            
            if (result == null)
            {
                return BadRequest(new { error = "Email or username already exists" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration");
            return StatusCode(500, new { error = "An error occurred during registration" });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            
            if (result == null)
            {
                return Unauthorized(new { error = "Invalid credentials or account is inactive" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { error = "An error occurred during login" });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] Core.DTOs.Auth.RefreshTokenRequest request)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(request.RefreshToken);
            
            if (result == null)
            {
                return Unauthorized(new { error = "Invalid or expired refresh token" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return StatusCode(500, new { error = "An error occurred while refreshing token" });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userId, out var userGuid))
            {
                await _authService.RevokeTokenAsync(userGuid);
            }

            return Ok(new { message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return StatusCode(500, new { error = "An error occurred during logout" });
        }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized();
            }

            var result = await _authService.ChangePasswordAsync(userGuid, request);
            
            if (!result)
            {
                return BadRequest(new { error = "Invalid current password" });
            }

            return Ok(new { message = "Password changed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, new { error = "An error occurred while changing password" });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _authService.InitiatePasswordResetAsync(request);
            
            // Always return success to avoid revealing user existence
            return Ok(new { message = "If the email exists, a password reset link has been sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating password reset");
            return StatusCode(500, new { error = "An error occurred while processing your request" });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            var result = await _authService.ResetPasswordAsync(request);
            
            if (!result)
            {
                return BadRequest(new { error = "Invalid or expired reset token" });
            }

            return Ok(new { message = "Password reset successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password");
            return StatusCode(500, new { error = "An error occurred while resetting password" });
        }
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        try
        {
            var result = await _authService.VerifyEmailAsync(request);
            
            if (!result)
            {
                return BadRequest(new { error = "Invalid or expired verification token" });
            }

            return Ok(new { message = "Email verified successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying email");
            return StatusCode(500, new { error = "An error occurred while verifying email" });
        }
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _authService.ResendVerificationEmailAsync(request.Email);
            
            // Always return success to avoid revealing user existence
            return Ok(new { message = "If the email exists and is unverified, a verification link has been sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending verification email");
            return StatusCode(500, new { error = "An error occurred while processing your request" });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return Unauthorized();
            }

            var user = await _authService.GetUserByIdAsync(userGuid);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                FirstName = user.FirstName,
                LastName = user.LastName,
                EmailVerified = user.EmailVerified,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500, new { error = "An error occurred while fetching user data" });
        }
    }

    [HttpGet("linkedin/authorize")]
    public IActionResult AuthorizeLinkedIn([FromQuery] string? returnUrl = null)
    {
        try
        {
            var state = GenerateSecureState();
            var redirectUri = GetLinkedInRedirectUri();
            
            _oauthStates[state] = new OAuthState
            {
                Platform = "linkedin",
                ReturnUrl = returnUrl ?? "/",
                CreatedAt = DateTime.UtcNow
            };
            
            var authUrl = _linkedInService.GetAuthorizationUrl(redirectUri, state);
            
            _logger.LogInformation("Redirecting to LinkedIn authorization");
            return Redirect(authUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating LinkedIn OAuth");
            return BadRequest(new { error = "Failed to initiate LinkedIn authentication" });
        }
    }

    [HttpGet("linkedin/callback")]
    public async Task<IActionResult> LinkedInCallback(
        [FromQuery] string code,
        [FromQuery] string state,
        [FromQuery] string? error = null,
        [FromQuery] string? error_description = null)
    {
        if (!string.IsNullOrEmpty(error))
        {
            _logger.LogError("LinkedIn OAuth error: {Error} - {Description}", error, error_description);
            return BadRequest(new { error, error_description });
        }
        
        if (!ValidateState(state, "linkedin"))
        {
            _logger.LogWarning("Invalid LinkedIn OAuth state");
            return BadRequest(new { error = "Invalid state parameter" });
        }
        
        try
        {
            var redirectUri = GetLinkedInRedirectUri();
            var tokenResponse = await _linkedInService.ExchangeCodeForTokenAsync(code, redirectUri);
            
            var userId = User.Identity?.Name ?? "system";
            await _tokenStore.StoreAsync(userId, "linkedin", tokenResponse.AccessToken, tokenResponse.RefreshToken, DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn));
            
            var profile = await _linkedInService.GetProfileAsync();
            
            _logger.LogInformation("Successfully authenticated LinkedIn user: {UserId}", profile.Id);
            
            var returnUrl = _oauthStates[state].ReturnUrl;
            _oauthStates.Remove(state);
            
            return Redirect($"{returnUrl}?platform=linkedin&success=true");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during LinkedIn OAuth callback");
            return BadRequest(new { error = "Failed to complete LinkedIn authentication" });
        }
    }

    [HttpPost("linkedin/refresh")]
    [Authorize]
    public async Task<IActionResult> RefreshLinkedInToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var tokenResponse = await _linkedInService.RefreshTokenAsync(request.RefreshToken);
            var userId = User.Identity?.Name ?? "system";
            await _tokenStore.StoreAsync(userId, "linkedin", tokenResponse.AccessToken, tokenResponse.RefreshToken, DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn));
            
            return Ok(new
            {
                success = true,
                accessToken = tokenResponse.AccessToken,
                expiresIn = tokenResponse.ExpiresIn
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing LinkedIn token");
            return BadRequest(new { error = "Failed to refresh LinkedIn token" });
        }
    }


    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> GetAuthenticationStatus()
    {
        var status = new Dictionary<string, PlatformAuthStatus>();
        
        try
        {
            var linkedInValid = await _linkedInService.ValidateCredentialsAsync();
            status["linkedin"] = new PlatformAuthStatus
            {
                Platform = "LinkedIn",
                IsAuthenticated = linkedInValid,
                LastChecked = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking LinkedIn status");
            status["linkedin"] = new PlatformAuthStatus
            {
                Platform = "LinkedIn",
                IsAuthenticated = false,
                Error = "Failed to check authentication status"
            };
        }
        
        // Twitter/X removed for Phase 1
        
        return Ok(status);
    }

    [HttpPost("revoke/{platform}")]
    [Authorize]
    public async Task<IActionResult> RevokeAuthentication(string platform)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
            await _tokenStore.RemoveAsync(userId, platform.ToLower());
            
            _logger.LogInformation("Revoked authentication for {Platform}", platform);
            
            return Ok(new { success = true, message = $"Authentication revoked for {platform}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking authentication for {Platform}", platform);
            return BadRequest(new { error = $"Failed to revoke authentication for {platform}" });
        }
    }

    private string GenerateSecureState()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }

    private bool ValidateState(string state, string expectedPlatform)
    {
        if (!_oauthStates.TryGetValue(state, out var oauthState))
        {
            return false;
        }
        
        if (oauthState.Platform != expectedPlatform)
        {
            return false;
        }
        
        if (DateTime.UtcNow - oauthState.CreatedAt > TimeSpan.FromMinutes(10))
        {
            _oauthStates.Remove(state);
            return false;
        }
        
        return true;
    }

    private string GetLinkedInRedirectUri()
    {
        var baseUrl = _configuration["OAuth:LinkedInRedirectUri"] 
            ?? $"{Request.Scheme}://{Request.Host}/api/auth/linkedin/callback";
        return baseUrl;
    }

    private string GetTwitterRedirectUri()
    {
        var baseUrl = _configuration["OAuth:TwitterRedirectUri"] 
            ?? $"{Request.Scheme}://{Request.Host}/api/auth/twitter/callback";
        return baseUrl;
    }

    // Removed local session token storage; using IOAuthTokenStore

    private string EncryptToken(string token)
    {
        var key = _configuration["OAuth:EncryptionKey"] ?? "default-encryption-key-change-in-production";
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32));
        aes.GenerateIV();
        
        using var encryptor = aes.CreateEncryptor();
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        var encryptedBytes = encryptor.TransformFinalBlock(tokenBytes, 0, tokenBytes.Length);
        
        var result = new byte[aes.IV.Length + encryptedBytes.Length];
        Array.Copy(aes.IV, 0, result, 0, aes.IV.Length);
        Array.Copy(encryptedBytes, 0, result, aes.IV.Length, encryptedBytes.Length);
        
        return Convert.ToBase64String(result);
    }

    private string DecryptToken(string encryptedToken)
    {
        var key = _configuration["OAuth:EncryptionKey"] ?? "default-encryption-key-change-in-production";
        var buffer = Convert.FromBase64String(encryptedToken);
        
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32));
        
        var iv = new byte[aes.IV.Length];
        var encrypted = new byte[buffer.Length - iv.Length];
        
        Array.Copy(buffer, 0, iv, 0, iv.Length);
        Array.Copy(buffer, iv.Length, encrypted, 0, encrypted.Length);
        
        aes.IV = iv;
        
        using var decryptor = aes.CreateDecryptor();
        var decryptedBytes = decryptor.TransformFinalBlock(encrypted, 0, encrypted.Length);
        
        return Encoding.UTF8.GetString(decryptedBytes);
    }
}

public class OAuthState
{
    public string Platform { get; set; } = string.Empty;
    public string ReturnUrl { get; set; } = string.Empty;
    public string? CodeVerifier { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class PlatformAuthStatus
{
    public string Platform { get; set; } = string.Empty;
    public bool IsAuthenticated { get; set; }
    public DateTime LastChecked { get; set; }
    public string? Error { get; set; }
}