using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Auth.Services;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.DTOs;
using ContentCreation.Api.Features.Common.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class Register
{
    public record Request(
        [Required][EmailAddress] string Email,
        [Required][MinLength(3)][MaxLength(100)] string Username,
        [Required][MinLength(8)] string Password,
        [MaxLength(100)] string? FirstName,
        [MaxLength(100)] string? LastName
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
                // Check if email already exists
                var emailExists = await _context.Users
                    .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower(), cancellationToken);
                
                if (emailExists)
                {
                    return new Result(false, null, null, null, null, "Email address is already registered");
                }

                // Check if username already exists
                var usernameExists = await _context.Users
                    .AnyAsync(u => u.Username.ToLower() == request.Username.ToLower(), cancellationToken);
                
                if (usernameExists)
                {
                    return new Result(false, null, null, null, null, "Username is already taken");
                }

                // Create new user
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email.Trim(),
                    Username = request.Username.Trim(),
                    FirstName = request.FirstName?.Trim(),
                    LastName = request.LastName?.Trim(),
                    PasswordHash = _passwordService.HashPassword(request.Password),
                    IsActive = true,
                    EmailVerified = false, // Require email verification
                    EmailVerificationToken = Guid.NewGuid().ToString(),
                    EmailVerificationExpires = DateTime.UtcNow.AddHours(24),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Generate tokens
                var accessToken = _jwtService.GenerateAccessToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();
                var expiresAt = _jwtService.GetTokenExpiry();

                // Store refresh token
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpires = DateTime.UtcNow.AddDays(7); // Refresh token valid for 7 days

                // Add user to database
                _context.Users.Add(user);
                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("User {Username} registered successfully", user.Username);

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

                // TODO: Send verification email
                // await _emailService.SendVerificationEmail(user.Email, user.EmailVerificationToken);

                return new Result(true, accessToken, refreshToken, expiresAt, userDto, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering user {Email}", request.Email);
                return new Result(false, null, null, null, null, "An error occurred during registration");
            }
        }
    }
}