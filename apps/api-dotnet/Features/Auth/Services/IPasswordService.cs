namespace ContentCreation.Api.Features.Auth.Services;

public interface IPasswordService
{
    string HashPassword(string password);
    bool VerifyPassword(string hashedPassword, string providedPassword);
    string GenerateSecureToken();
    string HashToken(string token);
}