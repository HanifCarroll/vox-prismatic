using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Common.Entities;

public class ProjectEvent
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? EventName { get; set; }
    
    public string? Description { get; set; }
    
    public string? UserId { get; set; }
    
    public object? EventData { get; set; }
    
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}