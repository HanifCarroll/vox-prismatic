using Microsoft.AspNetCore.Mvc;
using ContentCreation.Api.Features.Projects.DTOs;
using ContentCreation.Api.Features.Projects.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace ContentCreation.Api.Features.Projects;

[ApiController]
[Route("projects")]
[Authorize]
public class ContentProjectController : ControllerBase
{
    private readonly IContentProjectService _projectService;
    private readonly ILogger<ContentProjectController> _logger;

    public ContentProjectController(
        IContentProjectService projectService,
        ILogger<ContentProjectController> logger)
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
    /// Trigger transcript cleaning
    /// </summary>
    [HttpPost("{id}/process-content")]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessContent(string id, [FromBody] ProcessContentDto dto)
    {
        try
        {
            var project = await _projectService.ProcessContentAsync(id, dto);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing content for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to process content" });
        }
    }

    /// <summary>
    /// Generate insights from content
    /// </summary>
    [HttpPost("{id}/extract-insights")]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExtractInsights(string id)
    {
        try
        {
            var project = await _projectService.ExtractInsightsAsync(id);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting insights for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to extract insights" });
        }
    }

    /// <summary>
    /// Create posts from approved insights
    /// </summary>
    [HttpPost("{id}/generate-posts")]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GeneratePosts(string id, [FromBody] GeneratePostsDto? dto = null)
    {
        try
        {
            var project = await _projectService.GeneratePostsAsync(id, dto?.InsightIds);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating posts for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to generate posts" });
        }
    }

    /// <summary>
    /// Schedule approved posts
    /// </summary>
    [HttpPost("{id}/schedule-posts")]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SchedulePosts(string id, [FromBody] SchedulePostsDto? dto = null)
    {
        try
        {
            var project = await _projectService.SchedulePostsAsync(id, dto?.PostIds);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling posts for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to schedule posts" });
        }
    }

    /// <summary>
    /// Immediate publishing
    /// </summary>
    [HttpPost("{id}/publish-now")]
    [ProducesResponseType(typeof(ContentProjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PublishNow(string id, [FromBody] PublishNowDto dto)
    {
        try
        {
            if (dto.PostIds == null || !dto.PostIds.Any())
                return BadRequest(new { error = "PostIds are required" });

            var project = await _projectService.PublishNowAsync(id, dto.PostIds);
            return Ok(project);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing posts for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to publish posts" });
        }
    }

    /// <summary>
    /// Get insights scoped to project
    /// </summary>
    [HttpGet("{id}/insights")]
    [ProducesResponseType(typeof(List<InsightSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectInsights(string id)
    {
        try
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            return Ok(project.Insights);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insights for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to retrieve insights" });
        }
    }

    /// <summary>
    /// Get posts scoped to project
    /// </summary>
    [HttpGet("{id}/posts")]
    [ProducesResponseType(typeof(List<PostSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectPosts(string id)
    {
        try
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            return Ok(project.Posts);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving posts for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to retrieve posts" });
        }
    }

    /// <summary>
    /// Get project events/activity
    /// </summary>
    [HttpGet("{id}/events")]
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
    /// Update project metrics
    /// </summary>
    [HttpPost("{id}/update-metrics")]
    [ProducesResponseType(typeof(ProjectMetricsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMetrics(string id)
    {
        try
        {
            var metrics = await _projectService.UpdateProjectMetricsAsync(id);
            return Ok(metrics);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating metrics for project {ProjectId}", id);
            return StatusCode(500, new { error = "Failed to update metrics" });
        }
    }
}

public class GeneratePostsDto
{
    public List<string>? InsightIds { get; set; }
}

public class SchedulePostsDto
{
    public List<string>? PostIds { get; set; }
}

public class PublishNowDto
{
    public List<string> PostIds { get; set; } = new();
}