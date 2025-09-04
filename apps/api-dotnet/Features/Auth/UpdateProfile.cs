using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class UpdateProfile
{
    public record Request(
        Guid UserId,
        [MaxLength(100)] string? FirstName,
        [MaxLength(100)] string? LastName,
        [EmailAddress] string? Email,
        [MinLength(3)][MaxLength(100)] string? Username
    ) : IRequest<Result>;

    public record Result(
        bool IsSuccess,
        UserDto? User,
        string? Error
    );

    public class Handler : IRequestHandler<Request, Result>
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<Handler> _logger;

        public Handler(ApplicationDbContext context, ILogger<Handler> logger)
        {
            _context = context;
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
                    _logger.LogWarning("User not found for profile update: {UserId}", request.UserId);
                    return new Result(false, null, "User not found");
                }

                // Update email if provided and different
                if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
                {
                    // Check if new email is already in use
                    var emailExists = await _context.Users
                        .AnyAsync(u => u.Id != request.UserId && u.Email.ToLower() == request.Email.ToLower(), cancellationToken);
                    
                    if (emailExists)
                    {
                        return new Result(false, null, "Email address is already in use");
                    }

                    user.Email = request.Email.Trim();
                    // Reset email verification when email changes
                    user.EmailVerified = false;
                    user.EmailVerificationToken = Guid.NewGuid().ToString();
                    user.EmailVerificationExpires = DateTime.UtcNow.AddHours(24);
                    
                    // TODO: Send verification email for new email address
                }

                // Update username if provided and different
                if (!string.IsNullOrEmpty(request.Username) && request.Username != user.Username)
                {
                    // Check if new username is already in use
                    var usernameExists = await _context.Users
                        .AnyAsync(u => u.Id != request.UserId && u.Username.ToLower() == request.Username.ToLower(), cancellationToken);
                    
                    if (usernameExists)
                    {
                        return new Result(false, null, "Username is already in use");
                    }

                    user.Username = request.Username.Trim();
                }

                // Update names
                if (request.FirstName != null)
                    user.FirstName = string.IsNullOrWhiteSpace(request.FirstName) ? null : request.FirstName.Trim();
                
                if (request.LastName != null)
                    user.LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : request.LastName.Trim();

                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Profile updated for user {Username}", user.Username);

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

                return new Result(true, userDto, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for user {UserId}", request.UserId);
                return new Result(false, null, "An error occurred while updating profile");
            }
        }
    }
}