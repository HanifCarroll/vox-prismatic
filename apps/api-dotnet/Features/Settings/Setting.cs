using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Settings;

public class Setting
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty;
    
    public Dictionary<string, object>? Value { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
}