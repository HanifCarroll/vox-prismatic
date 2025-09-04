using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public class ForgotPassword
{
    public record Request(string Email) : IRequest<Result>;

    public class Validator : AbstractValidator<Request>
    {
        public Validator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
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
            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            // Always return success to prevent email enumeration
            if (user == null)
            {
                _logger.LogWarning("Password reset requested for non-existent email: {Email}", request.Email);
                return new Result(true, "If an account exists with that email, a password reset link has been sent.");
            }

            // Generate password reset token
            var resetToken = _passwordService.GenerateSecureToken();
            var tokenExpiry = DateTime.UtcNow.AddHours(1); // Token valid for 1 hour

            // Store reset token (hashed)
            user.PasswordResetToken = _passwordService.HashToken(resetToken);
            user.PasswordResetExpires = tokenExpiry;

            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                // Send password reset email
                await _emailService.SendPasswordResetEmailAsync(
                    user.Email, 
                    user.Username, 
                    resetToken);

                _logger.LogInformation("Password reset email sent to user {UserId}", user.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", user.Email);
                // Don't expose email sending failures to the user
            }

            return new Result(true, "If an account exists with that email, a password reset link has been sent.");
        }
    }
}