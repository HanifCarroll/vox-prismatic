using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Auth;

public static class GetCurrentUser
{
    public record Request(Guid UserId) : IRequest<Result>;

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
                    _logger.LogWarning("User not found: {UserId}", request.UserId);
                    return new Result(false, null, "User not found");
                }

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
                _logger.LogError(ex, "Error getting current user {UserId}", request.UserId);
                return new Result(false, null, "An error occurred while fetching user");
            }
        }
    }
}