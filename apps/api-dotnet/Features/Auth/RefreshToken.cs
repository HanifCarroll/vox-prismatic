using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class RefreshToken
{
    public record Request(
        [Required] string RefreshToken
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
        private readonly IJwtService _jwtService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext context,
            IJwtService jwtService,
            ILogger<Handler> logger)
        {
            _context = context;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                // Find user by refresh token
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.RefreshToken == request.RefreshToken, cancellationToken);

                if (user == null)
                {
                    _logger.LogWarning("Refresh token not found: {RefreshToken}", request.RefreshToken);
                    return new Result(false, null, null, null, null, "Invalid refresh token");
                }

                // Check if refresh token is expired
                if (user.RefreshTokenExpires == null || user.RefreshTokenExpires < DateTime.UtcNow)
                {
                    _logger.LogWarning("Refresh token expired for user: {Username}", user.Username);
                    
                    // Clear expired token
                    user.RefreshToken = null;
                    user.RefreshTokenExpires = null;
                    await _context.SaveChangesAsync(cancellationToken);
                    
                    return new Result(false, null, null, null, null, "Refresh token has expired");
                }

                // Check if user is active
                if (!user.IsActive)
                {
                    _logger.LogWarning("Refresh token attempt for inactive user: {Username}", user.Username);
                    return new Result(false, null, null, null, null, "Your account has been deactivated");
                }

                // Generate new tokens
                var accessToken = _jwtService.GenerateAccessToken(user);
                var newRefreshToken = _jwtService.GenerateRefreshToken();
                var expiresAt = _jwtService.GetTokenExpiry();

                // Update user with new refresh token
                user.RefreshToken = newRefreshToken;
                user.RefreshTokenExpires = DateTime.UtcNow.AddDays(7); // Refresh token valid for 7 days
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Token refreshed for user {Username}", user.Username);

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

                return new Result(true, accessToken, newRefreshToken, expiresAt, userDto, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return new Result(false, null, null, null, null, "An error occurred while refreshing token");
            }
        }
    }
}