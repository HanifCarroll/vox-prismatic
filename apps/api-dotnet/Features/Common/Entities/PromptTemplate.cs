using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class PromptTemplate
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PromptCategory Category { get; set; }
    public PromptStatus Status { get; set; }
    public PromptModel Model { get; set; }
    public string Template { get; set; } = string.Empty;
    public string? VariablesJson { get; set; } // Store variables as JSON
    public string? ModelParametersJson { get; set; } // Store model parameters as JSON
    public int Version { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public int UsageCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    
    // Navigation properties
    public ICollection<PromptHistory> History { get; set; } = new List<PromptHistory>();
}

public class PromptHistory
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public int TemplateVersion { get; set; }
    public string RenderedPrompt { get; set; } = string.Empty;
    public string? VariablesJson { get; set; } // Store used variables as JSON
    public string? Response { get; set; }
    public bool Success { get; set; }
    public long ExecutionTimeMs { get; set; }
    public DateTime ExecutedAt { get; set; }
    public string? UserId { get; set; }
    public Guid? ProjectId { get; set; }
    public string? Error { get; set; }
    
    // Navigation properties
    public PromptTemplate Template { get; set; } = null!;
    public ContentProject? Project { get; set; }
}