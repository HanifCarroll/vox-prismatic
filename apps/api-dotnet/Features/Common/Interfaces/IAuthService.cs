using ContentCreation.Api.Features.Common.DTOs.Auth;
using ContentCreation.Api.Features.Common.Entities;

namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
    Task<bool> RevokeTokenAsync(Guid userId);
    Task<User?> GetUserByIdAsync(Guid userId);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
    Task<bool> InitiatePasswordResetAsync(ForgotPasswordRequest request);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    Task<bool> VerifyEmailAsync(VerifyEmailRequest request);
    Task<bool> ResendVerificationEmailAsync(string email);
    string GenerateJwtToken(User user);
    string GenerateRefreshToken();
}