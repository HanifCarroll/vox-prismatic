using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.Entities;

public class ProjectActivity
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string ActivityType { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? ActivityName { get; set; }
    
    public string? Description { get; set; }
    
    public string? UserId { get; set; }
    
    public string? Metadata { get; set; }
    
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}