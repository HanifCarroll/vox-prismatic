using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Common.Entities;

public class ProjectActivity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ProjectId { get; set; }
    public virtual ContentProject Project { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string ActivityType { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? ActivityName { get; set; }
    
    public string? Description { get; set; }
    
    public Guid? UserId { get; set; }
    
    public string? Metadata { get; set; }
    
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}