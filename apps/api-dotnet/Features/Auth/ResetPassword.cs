using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public class ResetPassword
{
    public record Request(string Token, string NewPassword) : IRequest<Result>;

    public class Validator : AbstractValidator<Request>
    {
        public Validator()
        {
            RuleFor(x => x.Token).NotEmpty();
            RuleFor(x => x.NewPassword)
                .NotEmpty()
                .MinimumLength(8)
                .Matches(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$")
                .WithMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number");
        }
    }

    public record Result(bool Success, string Message);

    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _db;
        private readonly IPasswordService _passwordService;
        private readonly IEmailService _emailService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext db,
            IPasswordService passwordService,
            IEmailService emailService,
            ILogger<Handler> logger)
        {
            _db = db;
            _passwordService = passwordService;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<Result> Handle(Request request, CancellationToken cancellationToken)
        {
            // Hash the token to compare with stored hash
            var hashedToken = _passwordService.HashToken(request.Token);

            var user = await _db.Users
                .FirstOrDefaultAsync(u => 
                    u.PasswordResetToken == hashedToken &&
                    u.PasswordResetExpires != null &&
                    u.PasswordResetExpires > DateTime.UtcNow, 
                    cancellationToken);

            if (user == null)
            {
                _logger.LogWarning("Invalid or expired password reset token used");
                return new Result(false, "Invalid or expired reset token");
            }

            // Update password
            user.PasswordHash = _passwordService.HashPassword(request.NewPassword);
            
            // Clear reset token
            user.PasswordResetToken = null;
            user.PasswordResetExpires = null;
            
            // Update last modified
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                // Send password changed notification
                await _emailService.SendPasswordChangedNotificationAsync(
                    user.Email, 
                    user.Username);

                _logger.LogInformation("Password reset completed for user {UserId}", user.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password changed notification to {Email}", user.Email);
                // Don't fail the operation if email fails
            }

            return new Result(true, "Your password has been reset successfully");
        }
    }
}