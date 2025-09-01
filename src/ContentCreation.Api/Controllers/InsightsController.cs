using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.Interfaces;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/insights")]
[Authorize]
public class InsightsController : ControllerBase
{
    private readonly IInsightService _insightService;
    private readonly IInsightStateService _insightStateService;
    private readonly ILogger<InsightsController> _logger;

    public InsightsController(
        IInsightService insightService,
        IInsightStateService insightStateService,
        ILogger<InsightsController> logger)
    {
        _insightService = insightService;
        _insightStateService = insightStateService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new insight
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateInsightDto dto)
    {
        try
        {
            var insight = await _insightService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetOne), new { id = insight.Id }, insight);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating insight");
            return StatusCode(500, new { error = "Failed to create insight" });
        }
    }

    /// <summary>
    /// Get all insights
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<InsightDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] InsightFilterDto? filter = null)
    {
        try
        {
            var insights = await _insightService.GetAllAsync(filter);
            return Ok(insights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insights");
            return StatusCode(500, new { error = "Failed to retrieve insights" });
        }
    }

    /// <summary>
    /// Get insight status counts
    /// </summary>
    [HttpGet("status-counts")]
    [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatusCounts()
    {
        try
        {
            var counts = await _insightService.GetStatusCountsAsync();
            return Ok(counts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving status counts");
            return StatusCode(500, new { error = "Failed to retrieve status counts" });
        }
    }

    /// <summary>
    /// Get insights for a specific transcript
    /// </summary>
    [HttpGet("transcript/{transcriptId}")]
    [ProducesResponseType(typeof(List<InsightDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByTranscript(string transcriptId)
    {
        try
        {
            var insights = await _insightService.GetByTranscriptIdAsync(transcriptId);
            return Ok(new { data = insights, total = insights.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insights for transcript {TranscriptId}", transcriptId);
            return StatusCode(500, new { error = "Failed to retrieve insights" });
        }
    }

    /// <summary>
    /// Get insights for a specific project
    /// </summary>
    [HttpGet("project/{projectId}")]
    [ProducesResponseType(typeof(List<InsightDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProject(string projectId)
    {
        try
        {
            var insights = await _insightService.GetByProjectIdAsync(projectId);
            return Ok(new { data = insights, total = insights.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insights for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to retrieve insights" });
        }
    }

    /// <summary>
    /// Get a single insight by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOne(string id)
    {
        try
        {
            var insight = await _insightService.GetByIdAsync(id);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to retrieve insight" });
        }
    }

    /// <summary>
    /// Update an insight
    /// </summary>
    [HttpPatch("{id}")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateInsightDto dto)
    {
        try
        {
            var insight = await _insightService.UpdateAsync(id, dto);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to update insight" });
        }
    }

    /// <summary>
    /// Delete an insight
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            await _insightService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to delete insight" });
        }
    }

    /// <summary>
    /// Submit insight for review
    /// </summary>
    [HttpPost("{id}/submit-for-review")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitForReview(string id)
    {
        try
        {
            var insight = await _insightStateService.SubmitForReviewAsync(id);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting insight {InsightId} for review", id);
            return StatusCode(500, new { error = "Failed to submit insight for review" });
        }
    }

    /// <summary>
    /// Approve insight
    /// </summary>
    [HttpPost("{id}/approve")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Approve(string id, [FromBody] ApproveInsightDto? dto = null)
    {
        try
        {
            var approvedBy = dto?.ApprovedBy ?? User.Identity?.Name ?? "system";
            var insight = await _insightStateService.ApproveInsightAsync(id, approvedBy, dto?.Score);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to approve insight" });
        }
    }

    /// <summary>
    /// Reject insight
    /// </summary>
    [HttpPost("{id}/reject")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reject(string id, [FromBody] RejectInsightDto? dto = null)
    {
        try
        {
            var reviewedBy = dto?.ReviewedBy ?? User.Identity?.Name ?? "system";
            var reason = dto?.Reason ?? "Rejected during review";
            var insight = await _insightStateService.RejectInsightAsync(id, reviewedBy, reason);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to reject insight" });
        }
    }

    /// <summary>
    /// Archive insight
    /// </summary>
    [HttpPost("{id}/archive")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Archive(string id, [FromBody] ArchiveInsightDto? dto = null)
    {
        try
        {
            var reason = dto?.Reason ?? "Archived";
            var insight = await _insightStateService.ArchiveInsightAsync(id, reason);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to archive insight" });
        }
    }

    /// <summary>
    /// Restore archived insight
    /// </summary>
    [HttpPost("{id}/restore")]
    [ProducesResponseType(typeof(InsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Restore(string id)
    {
        try
        {
            var insight = await _insightStateService.RestoreInsightAsync(id);
            return Ok(insight);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to restore insight" });
        }
    }

    /// <summary>
    /// Perform bulk operations on insights
    /// </summary>
    [HttpPost("bulk")]
    [ProducesResponseType(typeof(BulkOperationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkOperation([FromBody] BulkInsightOperationDto dto)
    {
        try
        {
            var result = await _insightService.BulkOperationAsync(dto);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing bulk operation");
            return StatusCode(500, new { error = "Failed to perform bulk operation" });
        }
    }

    /// <summary>
    /// Get available state transitions for an insight
    /// </summary>
    [HttpGet("{id}/available-actions")]
    [ProducesResponseType(typeof(AvailableActionsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvailableActions(string id)
    {
        try
        {
            var actions = await _insightStateService.GetAvailableActionsAsync(id);
            return Ok(actions);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Insight with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available actions for insight {InsightId}", id);
            return StatusCode(500, new { error = "Failed to get available actions" });
        }
    }
}