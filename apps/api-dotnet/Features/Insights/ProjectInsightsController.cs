using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Api.Features.Insights.DTOs;
using ContentCreation.Api.Features.Insights.Interfaces;
using ContentCreation.Api.Features.Projects.Interfaces;

namespace ContentCreation.Api.Features.Insights;

[ApiController]
[Route("projects/{projectId}/insights")]
[Authorize]
public class ProjectInsightsController : ControllerBase
{
    private readonly IInsightService _insightService;
    private readonly IContentProjectService _projectService;
    private readonly ILogger<ProjectInsightsController> _logger;

    public ProjectInsightsController(
        IInsightService insightService,
        IContentProjectService projectService,
        ILogger<ProjectInsightsController> logger)
    {
        _insightService = insightService;
        _projectService = projectService;
        _logger = logger;
    }

    /// <summary>
    /// Get all insights for a specific project
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<InsightDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectInsights(
        string projectId,
        [FromQuery] InsightFilterDto? filter = null)
    {
        try
        {
            // Verify project exists
            await _projectService.GetProjectByIdAsync(projectId);
            
            filter ??= new InsightFilterDto();
            filter.ProjectId = projectId;
            
            var (insights, totalCount) = await _insightService.GetInsightsAsync(filter);
            
            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", filter.Page.ToString());
            Response.Headers.Append("X-Page-Size", filter.PageSize.ToString());
            
            return Ok(insights);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {projectId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insights for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to retrieve insights" });
        }
    }

    /// <summary>
    /// Get a specific insight within a project
    /// </summary>
    [HttpGet("{insightId}")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectInsight(string projectId, string insightId)
    {
        try
        {
            var insight = await _insightService.GetInsightByIdAsync(insightId);
            
            if (insight.ProjectId != projectId)
            {
                return NotFound(new { error = $"Insight {insightId} not found in project {projectId}" });
            }
            
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {insightId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insight {InsightId} for project {ProjectId}", 
                insightId, projectId);
            return StatusCode(500, new { error = "Failed to retrieve insight" });
        }
    }

    /// <summary>
    /// Create a new insight for a project
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateProjectInsight(
        string projectId,
        [FromBody] CreateInsightDto dto)
    {
        try
        {
            // Verify project exists
            await _projectService.GetProjectByIdAsync(projectId);
            
            dto.ProjectId = projectId;
            var insight = await _insightService.CreateInsightAsync(dto);
            
            return CreatedAtAction(
                nameof(GetProjectInsight),
                new { projectId, insightId = insight.Id },
                insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {projectId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating insight for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to create insight" });
        }
    }

    /// <summary>
    /// Update an insight within a project
    /// </summary>
    [HttpPatch("{insightId}")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProjectInsight(
        string projectId,
        string insightId,
        [FromBody] UpdateInsightDto dto)
    {
        try
        {
            var insight = await _insightService.GetInsightByIdAsync(insightId);
            
            if (insight.ProjectId != projectId)
            {
                return NotFound(new { error = $"Insight {insightId} not found in project {projectId}" });
            }
            
            var updatedInsight = await _insightService.UpdateInsightAsync(insightId, dto);
            return Ok(updatedInsight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {insightId} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating insight {InsightId} for project {ProjectId}", 
                insightId, projectId);
            return StatusCode(500, new { error = "Failed to update insight" });
        }
    }

    /// <summary>
    /// Delete an insight from a project
    /// </summary>
    [HttpDelete("{insightId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProjectInsight(string projectId, string insightId)
    {
        try
        {
            var insight = await _insightService.GetInsightByIdAsync(insightId);
            
            if (insight.ProjectId != projectId)
            {
                return NotFound(new { error = $"Insight {insightId} not found in project {projectId}" });
            }
            
            await _insightService.DeleteInsightAsync(insightId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {insightId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting insight {InsightId} for project {ProjectId}", 
                insightId, projectId);
            return StatusCode(500, new { error = "Failed to delete insight" });
        }
    }

    /// <summary>
    /// Bulk update insights in a project
    /// </summary>
    [HttpPatch("bulk")]
    [ProducesResponseType(typeof(List<InsightDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BulkUpdateProjectInsights(
        string projectId,
        [FromBody] BulkUpdateInsightsDto dto)
    {
        try
        {
            // Verify project exists
            await _projectService.GetProjectByIdAsync(projectId);
            
            // Verify all insights belong to the project
            var insights = await _insightService.GetInsightsByIdsAsync(dto.InsightIds);
            var invalidInsights = insights
                .Where(i => i.ProjectId != projectId)
                .Select(i => i.Id)
                .ToList();
            
            if (invalidInsights.Any())
            {
                return BadRequest(new 
                { 
                    error = "Some insights do not belong to this project",
                    invalidInsightIds = invalidInsights
                });
            }
            
            var updatedInsights = await _insightService.BulkUpdateInsightsAsync(dto);
            return Ok(updatedInsights);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk updating insights for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to bulk update insights" });
        }
    }

    /// <summary>
    /// Approve an insight
    /// </summary>
    [HttpPost("{insightId}/approve")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApproveInsight(
        string projectId,
        string insightId,
        [FromBody] ApproveInsightDto? dto = null)
    {
        try
        {
            var insight = await _insightService.GetInsightByIdAsync(insightId);
            
            if (insight.ProjectId != projectId)
            {
                return NotFound(new { error = $"Insight {insightId} not found in project {projectId}" });
            }
            
            var updateDto = new UpdateInsightDto
            {
                IsApproved = true,
                Status = "approved",
                ReviewNotes = dto?.ReviewNotes
            };
            
            var updatedInsight = await _insightService.UpdateInsightAsync(insightId, updateDto);
            return Ok(updatedInsight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {insightId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving insight {InsightId} for project {ProjectId}", 
                insightId, projectId);
            return StatusCode(500, new { error = "Failed to approve insight" });
        }
    }

    /// <summary>
    /// Reject an insight
    /// </summary>
    [HttpPost("{insightId}/reject")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectInsight(
        string projectId,
        string insightId,
        [FromBody] RejectInsightDto dto)
    {
        try
        {
            var insight = await _insightService.GetInsightByIdAsync(insightId);
            
            if (insight.ProjectId != projectId)
            {
                return NotFound(new { error = $"Insight {insightId} not found in project {projectId}" });
            }
            
            var updateDto = new UpdateInsightDto
            {
                IsApproved = false,
                Status = "rejected",
                ReviewNotes = dto.Reason
            };
            
            var updatedInsight = await _insightService.UpdateInsightAsync(insightId, updateDto);
            return Ok(updatedInsight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {insightId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting insight {InsightId} for project {ProjectId}", 
                insightId, projectId);
            return StatusCode(500, new { error = "Failed to reject insight" });
        }
    }
}

public class ApproveInsightDto
{
    public string? ReviewNotes { get; set; }
}

public class RejectInsightDto
{
    public string Reason { get; set; } = string.Empty;
}