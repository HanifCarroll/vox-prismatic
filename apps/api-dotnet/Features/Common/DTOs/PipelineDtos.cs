using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs.Pipeline;

public class StartPipelineDto
{
    public Guid ProjectId { get; set; }
    public string? TranscriptContent { get; set; }
    public bool AutoApproveInsights { get; set; } = false;
    public bool AutoApprovePosts { get; set; } = false;
    public Dictionary<string, object>? Configuration { get; set; }
}

public class PipelineStatusDto
{
    public Guid ProjectId { get; set; }
    public string JobId { get; set; } = string.Empty;
    public PipelineStage CurrentStage { get; set; }
    public PipelineStatus Status { get; set; }
    public int ProgressPercentage { get; set; }
    public string? CurrentStepMessage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TimeSpan? EstimatedTimeRemaining { get; set; }
    public List<PipelineStepResult> CompletedSteps { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public class PipelineStepResult
{
    public PipelineStage Stage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}

public class PipelineReviewDto
{
    public Guid ProjectId { get; set; }
    public PipelineStage Stage { get; set; }
    public ReviewDecision Decision { get; set; }
    public string? Feedback { get; set; }
    public Dictionary<string, object>? Changes { get; set; }
}

public class PipelineResultDto
{
    public Guid ProjectId { get; set; }
    public bool Success { get; set; }
    public PipelineStage FinalStage { get; set; }
    public TimeSpan TotalDuration { get; set; }
    public int InsightsGenerated { get; set; }
    public int PostsGenerated { get; set; }
    public int PostsScheduled { get; set; }
    public List<PipelineStepResult> Steps { get; set; } = new();
    public Dictionary<string, object>? Metadata { get; set; }
}

public class CancelPipelineDto
{
    public Guid ProjectId { get; set; }
    public string? Reason { get; set; }
}

public class RetryPipelineDto
{
    public Guid ProjectId { get; set; }
    public PipelineStage? FromStage { get; set; }
}