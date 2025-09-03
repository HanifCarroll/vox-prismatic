using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Common.Entities;

public class AnalyticsEvent
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;
    
    [Required]
    public string EntityId { get; set; } = string.Empty;
    
    public string? EventData { get; set; }
    
    public float? Value { get; set; }
    
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}