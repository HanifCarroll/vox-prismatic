using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Common.Entities;

public class Setting
{
    [Key]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty;
    
    [Required]
    public string Value { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string Category { get; set; } = "general";
    
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}