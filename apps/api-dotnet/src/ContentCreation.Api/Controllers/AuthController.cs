using ContentCreation.Core.DTOs.Auth;
using ContentCreation.Core.Interfaces;
using ContentCreation.Api.Controllers.Base;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILinkedInAuthService _linkedInAuthService;

    public AuthController(
        IAuthService authService,
        ILinkedInAuthService linkedInAuthService,
        ILogger<AuthController> logger) : base(logger)
    {
        _authService = authService;
        _linkedInAuthService = linkedInAuthService;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                var result = await _authService.RegisterAsync(request);
                if (result == null)
                    throw new ArgumentException("Email or username already exists");
                return result;
            },
            "An error occurred during registration");

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                var result = await _authService.LoginAsync(request);
                if (result == null)
                    throw new UnauthorizedAccessException("Invalid credentials or account is inactive");
                return result;
            },
            "An error occurred during login");

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                var result = await _authService.RefreshTokenAsync(request.RefreshToken);
                if (result == null)
                    throw new UnauthorizedAccessException("Invalid or expired refresh token");
                return result;
            },
            "An error occurred while refreshing token");

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout() =>
        await ExecuteAsync(
            async () =>
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userId, out var userGuid))
                {
                    await _authService.RevokeTokenAsync(userGuid);
                }
                return new { message = "Logged out successfully" };
            },
            "An error occurred during logout");

    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userGuid))
                    throw new UnauthorizedAccessException();
                
                var result = await _authService.ChangePasswordAsync(userGuid, request);
                if (!result)
                    throw new ArgumentException("Invalid current password");
                
                return new { message = "Password changed successfully" };
            },
            "An error occurred while changing password");

    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                await _authService.InitiatePasswordResetAsync(request);
                return new { message = "If the email exists, a password reset link has been sent" };
            },
            "An error occurred initiating password reset");

    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                var result = await _authService.ResetPasswordAsync(request);
                if (!result)
                    throw new ArgumentException("Invalid or expired reset token");
                
                return new { message = "Password reset successfully" };
            },
            "An error occurred resetting password");

    [HttpPost("verify-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                var result = await _authService.VerifyEmailAsync(request);
                if (!result)
                    throw new ArgumentException("Invalid or expired verification token");
                
                return new { message = "Email verified successfully" };
            },
            "An error occurred verifying email");

    [HttpPost("resend-verification")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request) =>
        await ExecuteAsync(
            async () =>
            {
                await _authService.ResendVerificationEmailAsync(request.Email);
                return new { message = "If the email exists, a verification link has been sent" };
            },
            "An error occurred resending verification email");

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentUser() =>
        await ExecuteAsync(
            async () =>
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userGuid))
                    throw new UnauthorizedAccessException();
                
                var user = await _authService.GetUserByIdAsync(userGuid);
                if (user == null)
                    throw new KeyNotFoundException("User not found");
                
                return new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    EmailVerified = user.EmailVerified,
                    CreatedAt = user.CreatedAt
                };
            },
            "An error occurred retrieving user information");

    [HttpGet("linkedin/auth")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public IActionResult InitiateLinkedInAuth([FromQuery] string? returnUrl = null) =>
        Redirect(_linkedInAuthService.GetAuthorizationUrl(returnUrl));

    [HttpGet("linkedin/callback")]
    [ProducesResponseType(typeof(LinkedInAuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LinkedInCallback([FromQuery] string code, [FromQuery] string state) =>
        await ExecuteAsync(
            () => _linkedInAuthService.HandleCallbackAsync(code, state),
            "LinkedIn authentication failed");

    [HttpGet("linkedin/status")]
    [ProducesResponseType(typeof(LinkedInStatusResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLinkedInStatus() =>
        await ExecuteAsync(
            () => _linkedInAuthService.GetConnectionStatusAsync(),
            "Failed to retrieve LinkedIn connection status");

    [HttpPost("linkedin/revoke")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RevokeLinkedInAccess() =>
        await ExecuteAsync(
            async () =>
            {
                await _linkedInAuthService.RevokeAccessAsync();
                return new { message = "LinkedIn access revoked successfully" };
            },
            "Failed to revoke LinkedIn access");
}