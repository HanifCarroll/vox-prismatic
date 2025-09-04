namespace ContentCreation.Api.Features.Auth.Services;

public interface ICurrentUserService
{
    Guid? GetUserId();
    string? GetUserEmail();
    string? GetUsername();
    bool IsAuthenticated();
}