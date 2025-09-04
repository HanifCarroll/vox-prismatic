namespace ContentCreation.Api.Features.Auth.Services;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string email, string username, string verificationToken);
    Task SendPasswordResetEmailAsync(string email, string username, string resetToken);
    Task SendWelcomeEmailAsync(string email, string username, string? firstName);
    Task SendPasswordChangedNotificationAsync(string email, string username);
}