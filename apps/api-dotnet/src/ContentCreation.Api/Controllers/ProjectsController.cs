using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs;
using ContentCreation.Core.Interfaces;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IContentProjectService _projectService;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IContentProjectService projectService,
        ILogger<ProjectsController> logger)
    {
        _projectService = projectService;
        _logger = logger;
    }

    /// <summary>
    /// List all content projects with summary data
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ContentProjectDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjects([FromQuery] ProjectFilterDto filter)
    {
        try
        {
            var (items, totalCount) = await _projectService.GetProjectsAsync(filter);
            
            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", filter.Page.ToString());
            Response.Headers.Append("X-Page-Size", filter.PageSize.ToString());
            
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving projects");
            return StatusCode(500, new { error = "Failed to retrieve projects" });
        }
    }

    /// <summary>
    /// Get complete project with all related entities
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ContentProjectDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProject(string id)
    {
        try
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to retrieve project" });
        }
    }

    /// <summary>
    /// Create new project (from transcript upload)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectDto dto)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
            var project = await _projectService.CreateProjectAsync(dto, userId);
            
            return CreatedAtAction(
                nameof(GetProject), 
                new { id = project.Id }, 
                project);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating project");
            return StatusCode(500, new { error = "Failed to create project" });
        }
    }

    /// <summary>
    /// Update project metadata
    /// </summary>
    [HttpPatch("{id}")]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProject(string id, [FromBody] UpdateProjectDto dto)
    {
        try
        {
            var project = await _projectService.UpdateProjectAsync(id, dto);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update project" });
        }
    }

    /// <summary>
    /// Archive/delete project
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProject(string id)
    {
        try
        {
            await _projectService.DeleteProjectAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to delete project" });
        }
    }

    /// <summary>
    /// Get project events/activity (history)
    /// </summary>
    [HttpGet("{id}/events/history")]
    [ProducesResponseType(typeof(List<ProjectEventDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectEvents(string id, [FromQuery] int limit = 20)
    {
        try
        {
            var events = await _projectService.GetProjectEventsAsync(id, limit);
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving events for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to retrieve events" });
        }
    }
    
    /// <summary>
    /// Batch advance projects to next stage
    /// </summary>
    [HttpPost("batch/advance-stage")]
    [ProducesResponseType(typeof(BatchOperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BatchAdvanceStage([FromBody] BatchAdvanceStageDto dto)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
            var results = new List<BatchOperationItemResultDto>();
            
            foreach (var projectId in dto.ProjectIds)
            {
                try
                {
                    var project = await _projectService.GetProjectByIdAsync(projectId);
                    await _projectService.AdvanceStageAsync(projectId, userId);
                    
                    results.Add(new BatchOperationItemResultDto
                    {
                        ProjectId = projectId,
                        Success = true,
                        Message = $"Advanced from {project.CurrentStage}"
                    });
                }
                catch (Exception ex)
                {
                    results.Add(new BatchOperationItemResultDto
                    {
                        ProjectId = projectId,
                        Success = false,
                        Message = ex.Message
                    });
                }
            }
            
            return Ok(new BatchOperationResultDto
            {
                TotalCount = dto.ProjectIds.Count,
                SuccessCount = results.Count(r => r.Success),
                FailureCount = results.Count(r => !r.Success),
                Results = results
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in batch stage advancement");
            return StatusCode(500, new { error = "Failed to batch advance stages" });
        }
    }
    
    /// <summary>
    /// Batch update project metadata
    /// </summary>
    [HttpPatch("batch")]
    [ProducesResponseType(typeof(BatchOperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BatchUpdateProjects([FromBody] BatchUpdateProjectsDto dto)
    {
        try
        {
            var results = new List<BatchOperationItemResultDto>();
            
            foreach (var projectId in dto.ProjectIds)
            {
                try
                {
                    await _projectService.UpdateProjectAsync(projectId, dto.Updates);
                    
                    results.Add(new BatchOperationItemResultDto
                    {
                        ProjectId = projectId,
                        Success = true,
                        Message = "Updated successfully"
                    });
                }
                catch (Exception ex)
                {
                    results.Add(new BatchOperationItemResultDto
                    {
                        ProjectId = projectId,
                        Success = false,
                        Message = ex.Message
                    });
                }
            }
            
            return Ok(new BatchOperationResultDto
            {
                TotalCount = dto.ProjectIds.Count,
                SuccessCount = results.Count(r => r.Success),
                FailureCount = results.Count(r => !r.Success),
                Results = results
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in batch update");
            return StatusCode(500, new { error = "Failed to batch update projects" });
        }
    }
    
    /// <summary>
    /// Batch delete projects
    /// </summary>
    [HttpDelete("batch")]
    [ProducesResponseType(typeof(BatchOperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BatchDeleteProjects([FromBody] BatchDeleteProjectsDto dto)
    {
        try
        {
            var results = new List<BatchOperationItemResultDto>();
            
            foreach (var projectId in dto.ProjectIds)
            {
                try
                {
                    await _projectService.DeleteProjectAsync(projectId);
                    
                    results.Add(new BatchOperationItemResultDto
                    {
                        ProjectId = projectId,
                        Success = true,
                        Message = "Deleted successfully"
                    });
                }
                catch (Exception ex)
                {
                    results.Add(new BatchOperationItemResultDto
                    {
                        ProjectId = projectId,
                        Success = false,
                        Message = ex.Message
                    });
                }
            }
            
            return Ok(new BatchOperationResultDto
            {
                TotalCount = dto.ProjectIds.Count,
                SuccessCount = results.Count(r => r.Success),
                FailureCount = results.Count(r => !r.Success),
                Results = results
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in batch delete");
            return StatusCode(500, new { error = "Failed to batch delete projects" });
        }
    }
}

public class GeneratePostsDto
{
    public List<string>? InsightIds { get; set; }
}

public class BatchAdvanceStageDto
{
    [Required]
    public List<string> ProjectIds { get; set; } = new();
}

public class BatchUpdateProjectsDto
{
    [Required]
    public List<string> ProjectIds { get; set; } = new();
    
    [Required]
    public UpdateProjectDto Updates { get; set; } = new();
}

public class BatchDeleteProjectsDto
{
    [Required]
    public List<string> ProjectIds { get; set; } = new();
}

public class BatchOperationResultDto
{
    public int TotalCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<BatchOperationItemResultDto> Results { get; set; } = new();
}

public class BatchOperationItemResultDto
{
    public string ProjectId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}