namespace ContentCreation.Core.DTOs;

public class ProjectActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string? ActivityName { get; set; }
    public string? Description { get; set; }
    public string? UserId { get; set; }
    public string? Metadata { get; set; }
    public DateTime OccurredAt { get; set; }
    public DateTime CreatedAt { get; set; }
}