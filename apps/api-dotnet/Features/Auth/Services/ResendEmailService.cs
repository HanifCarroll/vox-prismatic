using Resend;

namespace ContentCreation.Api.Features.Auth.Services;

public class ResendEmailService : IEmailService
{
    private readonly IResend _resend;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ResendEmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string _appUrl;

    public ResendEmailService(
        IResend resend,
        IConfiguration configuration,
        ILogger<ResendEmailService> logger)
    {
        _resend = resend;
        _configuration = configuration;
        _logger = logger;
        
        _fromEmail = _configuration["Resend:FromEmail"] ?? "noreply@contentcreation.app";
        _fromName = _configuration["Resend:FromName"] ?? "Content Creation Platform";
        _appUrl = _configuration["App:Url"] ?? "http://localhost:4200";
    }

    public async Task SendVerificationEmailAsync(string email, string username, string verificationToken)
    {
        try
        {
            var verificationUrl = $"{_appUrl}/verify-email?token={verificationToken}";
            
            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Verify Your Email</title>
                </head>
                <body style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <div style='background: linear-gradient(to right, #3B82F6, #6366F1); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                        <h1 style='color: white; margin: 0; font-size: 28px;'>Welcome to Content Creation Platform!</h1>
                    </div>
                    
                    <div style='background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;'>
                        <h2 style='color: #3B82F6; margin-top: 0;'>Hi {username},</h2>
                        
                        <p style='font-size: 16px;'>Thank you for signing up! Please verify your email address to get started with creating amazing content.</p>
                        
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{verificationUrl}' style='background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;'>
                                Verify Email Address
                            </a>
                        </div>
                        
                        <p style='font-size: 14px; color: #666;'>Or copy and paste this link into your browser:</p>
                        <p style='font-size: 14px; color: #3B82F6; word-break: break-all;'>{verificationUrl}</p>
                        
                        <hr style='border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;'>
                        
                        <p style='font-size: 14px; color: #666;'>This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                        
                        <p style='font-size: 14px; color: #666; margin-top: 30px;'>
                            Best regards,<br>
                            The Content Creation Team
                        </p>
                    </div>
                    
                    <div style='text-align: center; padding: 20px; font-size: 12px; color: #999;'>
                        <p>© 2024 Content Creation Platform. All rights reserved.</p>
                        <p>Transform your expertise into engaging content.</p>
                    </div>
                </body>
                </html>";

            var textContent = $@"Welcome to Content Creation Platform!

Hi {username},

Thank you for signing up! Please verify your email address to get started.

Click here to verify your email:
{verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The Content Creation Team";

            var message = new EmailMessage();
            message.From = $"{_fromName} <{_fromEmail}>";
            message.To.Add(email);
            message.Subject = "Verify your email - Content Creation Platform";
            message.HtmlBody = htmlContent;
            message.TextBody = textContent;

            var result = await _resend.EmailSendAsync(message);
            
            if (result != null)
            {
                _logger.LogInformation("Verification email sent successfully to {Email}", email);
            }
            else
            {
                _logger.LogWarning("Failed to send verification email to {Email}", email);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending verification email to {Email}", email);
            throw;
        }
    }

    public async Task SendPasswordResetEmailAsync(string email, string username, string resetToken)
    {
        try
        {
            var resetUrl = $"{_appUrl}/reset-password?token={resetToken}";
            
            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Reset Your Password</title>
                </head>
                <body style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <div style='background: linear-gradient(to right, #EF4444, #F97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                        <h1 style='color: white; margin: 0; font-size: 28px;'>Password Reset Request</h1>
                    </div>
                    
                    <div style='background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;'>
                        <h2 style='color: #EF4444; margin-top: 0;'>Hi {username},</h2>
                        
                        <p style='font-size: 16px;'>We received a request to reset your password. Click the button below to create a new password:</p>
                        
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{resetUrl}' style='background: #EF4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;'>
                                Reset Password
                            </a>
                        </div>
                        
                        <p style='font-size: 14px; color: #666;'>Or copy and paste this link into your browser:</p>
                        <p style='font-size: 14px; color: #EF4444; word-break: break-all;'>{resetUrl}</p>
                        
                        <hr style='border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;'>
                        
                        <p style='font-size: 14px; color: #666;'><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                        
                        <p style='font-size: 14px; color: #666;'>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                        
                        <p style='font-size: 14px; color: #666; margin-top: 30px;'>
                            Best regards,<br>
                            The Content Creation Team
                        </p>
                    </div>
                    
                    <div style='text-align: center; padding: 20px; font-size: 12px; color: #999;'>
                        <p>© 2024 Content Creation Platform. All rights reserved.</p>
                        <p>For security reasons, never share your password reset link with anyone.</p>
                    </div>
                </body>
                </html>";

            var textContent = $@"Password Reset Request

Hi {username},

We received a request to reset your password. Click the link below to create a new password:

{resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
The Content Creation Team";

            var message = new EmailMessage();
            message.From = $"{_fromName} <{_fromEmail}>";
            message.To.Add(email);
            message.Subject = "Reset your password - Content Creation Platform";
            message.HtmlBody = htmlContent;
            message.TextBody = textContent;

            var result = await _resend.EmailSendAsync(message);
            
            if (result != null)
            {
                _logger.LogInformation("Password reset email sent successfully to {Email}", email);
            }
            else
            {
                _logger.LogWarning("Failed to send password reset email to {Email}", email);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending password reset email to {Email}", email);
            throw;
        }
    }

    public async Task SendWelcomeEmailAsync(string email, string username, string? firstName)
    {
        try
        {
            var name = firstName ?? username;
            var dashboardUrl = $"{_appUrl}/dashboard";
            
            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Welcome to Content Creation Platform</title>
                </head>
                <body style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <div style='background: linear-gradient(to right, #10B981, #3B82F6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                        <h1 style='color: white; margin: 0; font-size: 28px;'>Welcome Aboard! 🎉</h1>
                    </div>
                    
                    <div style='background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;'>
                        <h2 style='color: #10B981; margin-top: 0;'>Hi {name},</h2>
                        
                        <p style='font-size: 16px;'>Your email has been verified successfully! You're all set to start transforming your expertise into engaging LinkedIn content.</p>
                        
                        <h3 style='color: #333; margin-top: 30px;'>Here's what you can do:</h3>
                        <ul style='font-size: 15px; color: #666;'>
                            <li style='margin-bottom: 10px;'>📁 <strong>Create Projects</strong> - Upload transcripts, audio, or video content</li>
                            <li style='margin-bottom: 10px;'>💡 <strong>Extract Insights</strong> - AI-powered analysis of your content</li>
                            <li style='margin-bottom: 10px;'>✍️ <strong>Generate Posts</strong> - Create LinkedIn-ready content from insights</li>
                            <li style='margin-bottom: 10px;'>📅 <strong>Schedule Publishing</strong> - Plan your content calendar</li>
                            <li style='margin-bottom: 10px;'>🔗 <strong>Connect LinkedIn</strong> - Publish directly to your profile</li>
                        </ul>
                        
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{dashboardUrl}' style='background: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;'>
                                Go to Dashboard
                            </a>
                        </div>
                        
                        <hr style='border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;'>
                        
                        <p style='font-size: 14px; color: #666;'>
                            Need help getting started? Check out our documentation or reach out to our support team.
                        </p>
                        
                        <p style='font-size: 14px; color: #666; margin-top: 30px;'>
                            Happy content creating!<br>
                            The Content Creation Team
                        </p>
                    </div>
                    
                    <div style='text-align: center; padding: 20px; font-size: 12px; color: #999;'>
                        <p>© 2024 Content Creation Platform. All rights reserved.</p>
                        <p>Transform your expertise into engaging content.</p>
                    </div>
                </body>
                </html>";

            var textContent = $@"Welcome Aboard!

Hi {name},

Your email has been verified successfully! You're all set to start transforming your expertise into engaging LinkedIn content.

Here's what you can do:
- Create Projects: Upload transcripts, audio, or video content
- Extract Insights: AI-powered analysis of your content
- Generate Posts: Create LinkedIn-ready content from insights
- Schedule Publishing: Plan your content calendar
- Connect LinkedIn: Publish directly to your profile

Go to your dashboard: {dashboardUrl}

Need help getting started? Check out our documentation or reach out to our support team.

Happy content creating!
The Content Creation Team";

            var message = new EmailMessage();
            message.From = $"{_fromName} <{_fromEmail}>";
            message.To.Add(email);
            message.Subject = "Welcome to Content Creation Platform! 🚀";
            message.HtmlBody = htmlContent;
            message.TextBody = textContent;

            var result = await _resend.EmailSendAsync(message);
            
            if (result != null)
            {
                _logger.LogInformation("Welcome email sent successfully to {Email}", email);
            }
            else
            {
                _logger.LogWarning("Failed to send welcome email to {Email}", email);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending welcome email to {Email}", email);
            // Don't throw for welcome emails - they're not critical
        }
    }

    public async Task SendPasswordChangedNotificationAsync(string email, string username)
    {
        try
        {
            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Password Changed</title>
                </head>
                <body style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <div style='background: linear-gradient(to right, #F59E0B, #EF4444); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                        <h1 style='color: white; margin: 0; font-size: 28px;'>Password Changed</h1>
                    </div>
                    
                    <div style='background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;'>
                        <h2 style='color: #F59E0B; margin-top: 0;'>Hi {username},</h2>
                        
                        <p style='font-size: 16px;'>Your password has been successfully changed.</p>
                        
                        <p style='font-size: 15px; color: #666;'>This change was made on {DateTime.UtcNow:MMMM dd, yyyy} at {DateTime.UtcNow:HH:mm} UTC.</p>
                        
                        <div style='background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;'>
                            <p style='margin: 0; font-size: 14px; color: #92400E;'>
                                <strong>⚠️ Didn't make this change?</strong><br>
                                If you didn't change your password, your account may be compromised. Please contact our support team immediately.
                            </p>
                        </div>
                        
                        <hr style='border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;'>
                        
                        <p style='font-size: 14px; color: #666;'>
                            For your security, we recommend:<br>
                            • Using a unique password for each account<br>
                            • Enabling two-factor authentication when available<br>
                            • Regularly updating your passwords
                        </p>
                        
                        <p style='font-size: 14px; color: #666; margin-top: 30px;'>
                            Best regards,<br>
                            The Content Creation Team
                        </p>
                    </div>
                    
                    <div style='text-align: center; padding: 20px; font-size: 12px; color: #999;'>
                        <p>© 2024 Content Creation Platform. All rights reserved.</p>
                        <p>This is an automated security notification.</p>
                    </div>
                </body>
                </html>";

            var textContent = $@"Password Changed

Hi {username},

Your password has been successfully changed.

This change was made on {DateTime.UtcNow:MMMM dd, yyyy} at {DateTime.UtcNow:HH:mm} UTC.

⚠️ Didn't make this change?
If you didn't change your password, your account may be compromised. Please contact our support team immediately.

For your security, we recommend:
• Using a unique password for each account
• Enabling two-factor authentication when available
• Regularly updating your passwords

Best regards,
The Content Creation Team";

            var message = new EmailMessage();
            message.From = $"{_fromName} <{_fromEmail}>";
            message.To.Add(email);
            message.Subject = "Your password has been changed - Content Creation Platform";
            message.HtmlBody = htmlContent;
            message.TextBody = textContent;

            var result = await _resend.EmailSendAsync(message);
            
            if (result != null)
            {
                _logger.LogInformation("Password changed notification sent successfully to {Email}", email);
            }
            else
            {
                _logger.LogWarning("Failed to send password changed notification to {Email}", email);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending password changed notification to {Email}", email);
            // Don't throw for notifications - they're not critical
        }
    }
}