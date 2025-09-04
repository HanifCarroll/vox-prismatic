using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class Login
{
    public record Request(
        [Required] string EmailOrUsername,
        [Required] string Password
    ) : IRequest<Result>;

    public record Result(
        bool IsSuccess,
        string? AccessToken,
        string? RefreshToken,
        DateTime? ExpiresAt,
        UserDto? User,
        string? Error
    );

    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordService _passwordService;
        private readonly IJwtService _jwtService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext context,
            IPasswordService passwordService,
            IJwtService jwtService,
            ILogger<Handler> logger)
        {
            _context = context;
            _passwordService = passwordService;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                // Find user by email or username
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => 
                        u.Email.ToLower() == request.EmailOrUsername.ToLower() ||
                        u.Username.ToLower() == request.EmailOrUsername.ToLower(),
                        cancellationToken);

                if (user == null)
                {
                    _logger.LogWarning("Login attempt failed - user not found: {EmailOrUsername}", request.EmailOrUsername);
                    return new Result(false, null, null, null, null, "Invalid email/username or password");
                }

                // Verify password
                if (!_passwordService.VerifyPassword(user.PasswordHash, request.Password))
                {
                    _logger.LogWarning("Login attempt failed - invalid password for user: {Username}", user.Username);
                    return new Result(false, null, null, null, null, "Invalid email/username or password");
                }

                // Check if user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("Login attempt failed - inactive user: {Username}", user.Username);
                    return new Result(false, null, null, null, null, "Your account has been deactivated");
                }

                // Generate tokens
                var accessToken = _jwtService.GenerateAccessToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();
                var expiresAt = _jwtService.GetTokenExpiry();

                // Update user with new refresh token and last login time
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpires = DateTime.UtcNow.AddDays(7); // Refresh token valid for 7 days
                user.LastLoginAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("User {Username} logged in successfully", user.Username);

                // Create UserDto for response
                var userDto = new UserDto(
                    user.Id,
                    user.Email,
                    user.Username,
                    user.FirstName,
                    user.LastName,
                    user.EmailVerified,
                    user.CreatedAt,
                    user.LastLoginAt
                );

                return new Result(true, accessToken, refreshToken, expiresAt, userDto, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for {EmailOrUsername}", request.EmailOrUsername);
                return new Result(false, null, null, null, null, "An error occurred during login");
            }
        }
    }
}