using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class OAuthToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public SocialPlatform Platform { get; set; } = SocialPlatform.LinkedIn;
    
    [Required]
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    
    public string? RefreshTokenEncrypted { get; set; }
    
    public DateTime? ExpiresAt { get; set; }
    
    public string? Scope { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Domain methods
    public void UpdateToken(string accessToken, string? refreshToken, DateTime? expiresAt)
    {
        AccessTokenEncrypted = accessToken;
        RefreshTokenEncrypted = refreshToken;
        ExpiresAt = expiresAt;
        UpdatedAt = DateTime.UtcNow;
    }
}


