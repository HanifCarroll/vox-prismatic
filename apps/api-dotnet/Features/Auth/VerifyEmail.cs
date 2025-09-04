using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public class VerifyEmail
{
    public record Request(string Token) : IRequest<Result>;

    public class Validator : AbstractValidator<Request>
    {
        public Validator()
        {
            RuleFor(x => x.Token).NotEmpty();
        }
    }

    public record Result(bool Success, string Message, UserDto? User);

    public record UserDto(
        Guid Id,
        string Email,
        string Username,
        string? FirstName,
        string? LastName,
        bool EmailVerified);

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
                    u.EmailVerificationToken == hashedToken &&
                    u.EmailVerificationExpires != null &&
                    u.EmailVerificationExpires > DateTime.UtcNow, 
                    cancellationToken);

            if (user == null)
            {
                _logger.LogWarning("Invalid or expired email verification token used");
                return new Result(false, "Invalid or expired verification token", null);
            }

            // Check if already verified
            if (user.EmailVerified)
            {
                _logger.LogInformation("User {UserId} attempted to verify already verified email", user.Id);
                return new Result(true, "Email already verified", new UserDto(
                    user.Id,
                    user.Email,
                    user.Username,
                    user.FirstName,
                    user.LastName,
                    user.EmailVerified));
            }

            // Mark email as verified
            user.EmailVerified = true;
            user.EmailVerificationToken = null;
            user.EmailVerificationExpires = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                // Send welcome email
                await _emailService.SendWelcomeEmailAsync(
                    user.Email, 
                    user.Username, 
                    user.FirstName);

                _logger.LogInformation("Email verified and welcome email sent for user {UserId}", user.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send welcome email to {Email}", user.Email);
                // Don't fail the verification if welcome email fails
            }

            return new Result(true, "Email verified successfully", new UserDto(
                user.Id,
                user.Email,
                user.Username,
                user.FirstName,
                user.LastName,
                user.EmailVerified));
        }
    }
}