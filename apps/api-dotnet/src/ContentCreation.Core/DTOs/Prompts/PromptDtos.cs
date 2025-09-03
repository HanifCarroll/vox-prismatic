using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.DTOs.Prompts;

public class PromptTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PromptCategory Category { get; set; }
    public PromptStatus Status { get; set; }
    public PromptModel Model { get; set; }
    public string Template { get; set; } = string.Empty;
    public List<PromptVariableDto> Variables { get; set; } = new();
    public Dictionary<string, object>? ModelParameters { get; set; }
    public int Version { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public double? SuccessRate { get; set; }
    public int UsageCount { get; set; }
}

public class PromptVariableDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "string"; // string, number, boolean, array
    public bool Required { get; set; }
    public object? DefaultValue { get; set; }
    public List<string>? AllowedValues { get; set; }
    public string? ValidationPattern { get; set; }
}

public class CreatePromptTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PromptCategory Category { get; set; }
    public PromptModel Model { get; set; } = PromptModel.GeminiPro;
    public string Template { get; set; } = string.Empty;
    public List<PromptVariableDto> Variables { get; set; } = new();
    public Dictionary<string, object>? ModelParameters { get; set; }
    public bool MakeDefault { get; set; } = false;
}

public class UpdatePromptTemplateDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public PromptStatus? Status { get; set; }
    public string? Template { get; set; }
    public List<PromptVariableDto>? Variables { get; set; }
    public Dictionary<string, object>? ModelParameters { get; set; }
    public bool? MakeDefault { get; set; }
}

public class RenderPromptDto
{
    public Guid TemplateId { get; set; }
    public Dictionary<string, object> Variables { get; set; } = new();
    public bool ValidateVariables { get; set; } = true;
}

public class RenderPromptResultDto
{
    public string RenderedPrompt { get; set; } = string.Empty;
    public Guid TemplateId { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public int TemplateVersion { get; set; }
    public Dictionary<string, object> UsedVariables { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class TestPromptDto
{
    public Guid TemplateId { get; set; }
    public Dictionary<string, object> Variables { get; set; } = new();
    public string? TestInput { get; set; }
    public bool ExecutePrompt { get; set; } = false; // If true, actually call the AI
}

public class TestPromptResultDto
{
    public string RenderedPrompt { get; set; } = string.Empty;
    public string? AiResponse { get; set; }
    public bool Success { get; set; }
    public string? Error { get; set; }
    public TimeSpan? ExecutionTime { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class PromptHistoryDto
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public int TemplateVersion { get; set; }
    public string RenderedPrompt { get; set; } = string.Empty;
    public Dictionary<string, object> Variables { get; set; } = new();
    public string? Response { get; set; }
    public bool Success { get; set; }
    public TimeSpan ExecutionTime { get; set; }
    public DateTime ExecutedAt { get; set; }
    public string? UserId { get; set; }
    public Guid? ProjectId { get; set; }
}

public class PromptFilterDto
{
    public PromptCategory? Category { get; set; }
    public PromptStatus? Status { get; set; }
    public PromptModel? Model { get; set; }
    public bool? IsDefault { get; set; }
    public string? SearchTerm { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class ClonePromptTemplateDto
{
    public Guid SourceTemplateId { get; set; }
    public string NewName { get; set; } = string.Empty;
    public string? NewDescription { get; set; }
    public bool MakeActive { get; set; } = false;
}

public class PromptStatsDto
{
    public Guid TemplateId { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public int TotalUsage { get; set; }
    public int SuccessfulExecutions { get; set; }
    public int FailedExecutions { get; set; }
    public double SuccessRate { get; set; }
    public TimeSpan AverageExecutionTime { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public Dictionary<string, int> UsageByCategory { get; set; } = new();
}