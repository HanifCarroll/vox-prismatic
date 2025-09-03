namespace ContentCreation.Api.Features.Common.DTOs;

public class PipelineStatusDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public int OverallProgress { get; set; }
    public string? CurrentActivity { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public List<string> AllowedTransitions { get; set; } = new();
    public Dictionary<string, StageStatus> StageStatuses { get; set; } = new();
}

public class StageStatus
{
    public bool IsComplete { get; set; }
    public bool IsActive { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? LastError { get; set; }
}