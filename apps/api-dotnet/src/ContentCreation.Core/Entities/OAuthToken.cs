using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class OAuthToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; } = "linkedin"; // e.g., linkedin
    
    [Required]
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    
    public string? RefreshTokenEncrypted { get; set; }
    
    public DateTime? ExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}


