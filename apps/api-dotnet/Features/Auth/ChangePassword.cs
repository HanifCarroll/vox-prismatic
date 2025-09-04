using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class ChangePassword
{
    public record Request(
        Guid UserId,
        [Required] string CurrentPassword,
        [Required][MinLength(8)] string NewPassword
    ) : IRequest<Result>;

    public record Result(
        bool IsSuccess,
        string? Message,
        string? Error
    );

    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordService _passwordService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext context,
            IPasswordService passwordService,
            ILogger<Handler> logger)
        {
            _context = context;
            _passwordService = passwordService;
            _logger = logger;
        }

        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

                if (user == null)
                {
                    _logger.LogWarning("User not found for password change: {UserId}", request.UserId);
                    return new Result(false, null, "User not found");
                }

                // Verify current password
                if (!_passwordService.VerifyPassword(user.PasswordHash, request.CurrentPassword))
                {
                    _logger.LogWarning("Invalid current password for user: {Username}", user.Username);
                    return new Result(false, null, "Current password is incorrect");
                }

                // Hash new password
                user.PasswordHash = _passwordService.HashPassword(request.NewPassword);
                user.UpdatedAt = DateTime.UtcNow;

                // Optionally invalidate refresh token to force re-login
                // user.RefreshToken = null;
                // user.RefreshTokenExpires = null;

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Password changed successfully for user {Username}", user.Username);

                return new Result(true, "Password changed successfully", null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password for user {UserId}", request.UserId);
                return new Result(false, null, "An error occurred while changing password");
            }
        }
    }
}