using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class User
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(256)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? FirstName { get; set; }
    
    [MaxLength(100)]
    public string? LastName { get; set; }
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    public bool IsActive { get; set; } = true;
    
    public bool EmailVerified { get; set; } = false;
    
    public string? EmailVerificationToken { get; set; }
    
    public DateTime? EmailVerificationExpires { get; set; }
    
    public string? PasswordResetToken { get; set; }
    
    public DateTime? PasswordResetExpires { get; set; }
    
    public string? RefreshToken { get; set; }
    
    public DateTime? RefreshTokenExpires { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public DateTime? LastLoginAt { get; set; }
    
    // Navigation properties
    public virtual ICollection<ContentProject> Projects { get; set; } = new List<ContentProject>();
    public virtual ICollection<OAuthToken> OAuthTokens { get; set; } = new List<OAuthToken>();
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}