using ContentCreation.Api.Features.Common.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class Logout
{
    public record Request(Guid UserId) : IRequest<Result>;

    public record Result(
        bool IsSuccess,
        string? Message,
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
                    // Don't reveal that the user doesn't exist
                    return new Result(true, "Logged out successfully", null);
                }

                // Invalidate refresh token
                user.RefreshToken = null;
                user.RefreshTokenExpires = null;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("User {Username} logged out", user.Username);

                return new Result(true, "Logged out successfully", null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout for user {UserId}", request.UserId);
                // Don't fail logout on error
                return new Result(true, "Logged out successfully", null);
            }
        }
    }
}