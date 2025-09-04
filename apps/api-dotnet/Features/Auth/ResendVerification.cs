using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public class ResendVerification
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
                _logger.LogWarning("Verification resend requested for non-existent email: {Email}", request.Email);
                return new Result(true, "If an account exists with that email and is not yet verified, a new verification email has been sent.");
            }

            // Check if already verified
            if (user.EmailVerified)
            {
                _logger.LogInformation("Verification resend requested for already verified user {UserId}", user.Id);
                return new Result(true, "If an account exists with that email and is not yet verified, a new verification email has been sent.");
            }

            // Check rate limiting (prevent spam)
            if (user.EmailVerificationExpires != null)
            {
                var timeSinceLastRequest = DateTime.UtcNow - (user.EmailVerificationExpires.Value.AddDays(-1));
                if (timeSinceLastRequest.TotalMinutes < 5)
                {
                    _logger.LogWarning("Verification resend rate limit hit for user {UserId}", user.Id);
                    return new Result(false, "Please wait 5 minutes before requesting another verification email.");
                }
            }

            // Generate new verification token
            var verificationToken = _passwordService.GenerateSecureToken();
            var tokenExpiry = DateTime.UtcNow.AddDays(1); // Token valid for 24 hours

            // Store verification token (hashed)
            user.EmailVerificationToken = _passwordService.HashToken(verificationToken);
            user.EmailVerificationExpires = tokenExpiry;

            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                // Send verification email
                await _emailService.SendVerificationEmailAsync(
                    user.Email, 
                    user.Username, 
                    verificationToken);

                _logger.LogInformation("Verification email resent to user {UserId}", user.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resend verification email to {Email}", user.Email);
                // Don't expose email sending failures to the user
            }

            return new Result(true, "If an account exists with that email and is not yet verified, a new verification email has been sent.");
        }
    }
}