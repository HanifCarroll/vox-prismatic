using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Analytics;

public class AnalyticsEvent
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;
    
    public Dictionary<string, object>? EventData { get; set; }
    
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    [MaxLength(100)]
    public string? SessionId { get; set; }
    
    public DateTime CreatedAt { get; set; }
}