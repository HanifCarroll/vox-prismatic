using ContentCreation.Api.Features.Common.Entities;

namespace ContentCreation.Api.Features.Auth.Services;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    DateTime GetTokenExpiry();
    Guid? ValidateToken(string token);
}