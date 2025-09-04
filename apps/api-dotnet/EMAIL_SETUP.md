# Email Service Configuration Guide

## Overview
The Content Creation Platform uses Resend as its email service provider for sending transactional emails including:
- Email verification
- Password reset
- Welcome emails
- Password change notifications

## Configuration Steps

### 1. Sign up for Resend
1. Go to [https://resend.com](https://resend.com)
2. Create an account
3. Generate an API key from the dashboard

### 2. Domain Verification (Production)
For production use, you'll need to verify your domain:
1. Add your domain in Resend dashboard
2. Add the required DNS records (SPF, DKIM, DMARC)
3. Wait for verification

### 3. Configure the Application

#### Option A: Environment Variables (Recommended)
Set the following environment variable:
```bash
export RESEND_API_KEY="re_your_api_key_here"
```

#### Option B: appsettings.json
Update the Resend section in `appsettings.json` or `appsettings.Development.json`:
```json
{
  "Resend": {
    "ApiKey": "re_your_api_key_here",
    "FromEmail": "noreply@yourdomain.com",
    "FromName": "Your App Name"
  },
  "App": {
    "Url": "https://yourdomain.com"
  }
}
```

## Testing Email Functionality

### Local Development
For local testing, Resend provides test email addresses:
- `delivered@resend.dev` - Simulates successful delivery
- `bounced@resend.dev` - Simulates bounced email
- `complained@resend.dev` - Simulates spam complaint

### Test the Integration
1. Start the application:
   ```bash
   dotnet run
   ```

2. Register a new user via the API:
   ```bash
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "username": "testuser",
       "password": "TestPassword123!"
     }'
   ```

3. Check Resend dashboard for email logs

## Email Templates
The email templates are defined in `/Features/Auth/Services/ResendEmailService.cs` and include:
- Responsive HTML design
- Plain text fallbacks
- Branded headers with gradients
- Clear call-to-action buttons

## Security Considerations
1. **Never commit API keys** to version control
2. Use environment variables for production
3. Implement rate limiting for email-triggering endpoints
4. Validate email addresses before sending
5. Hash and expire verification/reset tokens

## Troubleshooting

### Common Issues

#### "Missing API Key" Error
- Ensure `RESEND_API_KEY` environment variable is set
- Or verify the `Resend:ApiKey` in appsettings.json

#### "Invalid API Key" Error
- Verify the API key is correct
- Check if the key has been revoked or regenerated

#### "Validation Error" for External Emails
- For testing, use `delivered@resend.dev`
- For real emails, verify your domain first

#### Emails Not Arriving
1. Check Resend dashboard for delivery status
2. Verify sender domain is authenticated
3. Check spam folders
4. Ensure recipient email is valid

## Production Checklist
- [ ] Domain verified in Resend
- [ ] SPF, DKIM, DMARC records configured
- [ ] API key stored securely (environment variable or secret manager)
- [ ] From email uses verified domain
- [ ] App URL points to production domain
- [ ] Rate limiting configured
- [ ] Error logging enabled
- [ ] Email templates reviewed and tested

## API Endpoints
The following endpoints trigger emails:
- `POST /api/auth/register` - Sends verification email
- `POST /api/auth/forgot-password` - Sends password reset email
- `POST /api/auth/reset-password` - Sends password changed notification
- `POST /api/auth/verify-email` - Sends welcome email after verification
- `POST /api/auth/resend-verification` - Resends verification email

## Support
For Resend-specific issues, consult:
- [Resend Documentation](https://resend.com/docs)
- [Resend .NET SDK](https://github.com/resend/resend-dotnet)