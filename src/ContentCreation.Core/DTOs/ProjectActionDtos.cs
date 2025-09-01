using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.DTOs;

public class ExtractInsightsDto
{
    public int MaxInsights { get; set; } = 10;
    public int MinScore { get; set; } = 70;
    public bool AutoApprove { get; set; } = false;
}

public class GeneratePostsDto
{
    public List<string>? InsightIds { get; set; }
    public List<string> Platforms { get; set; } = new() { "linkedin", "x" };
    public bool GenerateVariations { get; set; } = false;
}

public class SchedulePostsDto
{
    public List<string>? PostIds { get; set; }
    public DateTime? StartDate { get; set; }
    public int? IntervalHours { get; set; }
    public bool UseOptimalTiming { get; set; } = true;
}

public class PublishNowDto
{
    [Required]
    public List<string> PostIds { get; set; } = new();
    public bool PublishToAllPlatforms { get; set; } = true;
}

public class ApproveInsightsDto
{
    [Required]
    public List<string> InsightIds { get; set; } = new();
    public string? ReviewNote { get; set; }
}

public class RejectInsightsDto
{
    [Required]
    public List<string> InsightIds { get; set; } = new();
    public string? RejectionReason { get; set; }
}

public class ApprovePostsDto
{
    [Required]
    public List<string> PostIds { get; set; } = new();
    public string? ReviewNote { get; set; }
    public bool AutoSchedule { get; set; } = false;
}

public class RejectPostsDto
{
    [Required]
    public List<string> PostIds { get; set; } = new();
    public string? RejectionReason { get; set; }
    public bool RegenerateFromInsights { get; set; } = false;
}

public class ArchiveProjectDto
{
    public string? ArchiveReason { get; set; }
    public bool PreserveData { get; set; } = true;
}

public class RestoreProjectDto
{
    public bool ResetProgress { get; set; } = false;
    public string? RestoreReason { get; set; }
}

public class ProjectActionResultDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public string PreviousStage { get; set; } = string.Empty;
    public int OverallProgress { get; set; }
    public List<string> AvailableActions { get; set; } = new();
    public string Message { get; set; } = string.Empty;
    public bool Success { get; set; }
    public object? ActionData { get; set; }
}

public class ProjectStateDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public int OverallProgress { get; set; }
    public List<string> AvailableActions { get; set; } = new();
    public bool RequiresUserAction { get; set; }
    public bool IsInFinalState { get; set; }
    public ProjectMetricsDto Metrics { get; set; } = new();
}

public class BulkProjectActionDto
{
    [Required]
    public List<string> ProjectIds { get; set; } = new();
    public string Action { get; set; } = string.Empty;
    public object? ActionParameters { get; set; }
}