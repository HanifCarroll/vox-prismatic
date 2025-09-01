using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Api.Features.Projects.DTOs;

public class CreateProjectDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public List<string> Tags { get; set; } = new();
    
    [Required]
    public string SourceType { get; set; } = "transcript";
    
    public string? SourceUrl { get; set; }
    
    public string? FileName { get; set; }
    
    public string? TranscriptContent { get; set; }
    
    public WorkflowConfigurationDto? WorkflowConfig { get; set; }
}

public class UpdateProjectDto
{
    [MaxLength(200)]
    public string? Title { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public List<string>? Tags { get; set; }
    
    public WorkflowConfigurationDto? WorkflowConfig { get; set; }
}

public class ProjectFilterDto
{
    public string? Stage { get; set; }
    public List<string>? Tags { get; set; }
    public string? SearchTerm { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? CreatedBy { get; set; }
    public bool? HasScheduledPosts { get; set; }
    public bool? HasPublishedPosts { get; set; }
    public string SortBy { get; set; } = "createdAt";
    public bool SortDescending { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class ProjectActionDto
{
    [Required]
    public string Action { get; set; } = string.Empty;
    
    public object? Parameters { get; set; }
}

public class ProcessContentDto
{
    public bool CleanTranscript { get; set; } = true;
    public bool GenerateTitle { get; set; } = true;
}