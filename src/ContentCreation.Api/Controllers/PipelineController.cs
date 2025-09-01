using ContentCreation.Core.DTOs.Pipeline;
using ContentCreation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContentCreation.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PipelineController : ControllerBase
{
    private readonly IContentPipelineService _pipelineService;
    private readonly ILogger<PipelineController> _logger;

    public PipelineController(
        IContentPipelineService pipelineService,
        ILogger<PipelineController> logger)
    {
        _pipelineService = pipelineService;
        _logger = logger;
    }

    /// <summary>
    /// Start a new content processing pipeline for a project
    /// </summary>
    [HttpPost("start")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<string>> StartPipeline([FromBody] StartPipelineDto request)
    {
        if (request.ProjectId == Guid.Empty)
        {
            return BadRequest("ProjectId is required");
        }

        try
        {
            var jobId = await _pipelineService.StartPipelineAsync(request);
            _logger.LogInformation("Started pipeline for project {ProjectId} with job ID {JobId}", 
                request.ProjectId, jobId);
            
            return Ok(new { jobId, message = "Pipeline started successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start pipeline for project {ProjectId}", request.ProjectId);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get the current status of a pipeline
    /// </summary>
    [HttpGet("status/{projectId}")]
    [ProducesResponseType(typeof(PipelineStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PipelineStatusDto>> GetPipelineStatus(Guid projectId)
    {
        var status = await _pipelineService.GetPipelineStatusAsync(projectId);
        
        if (status == null)
        {
            return NotFound(new { error = $"No pipeline found for project {projectId}" });
        }

        return Ok(status);
    }

    /// <summary>
    /// Get the final result of a completed pipeline
    /// </summary>
    [HttpGet("result/{projectId}")]
    [ProducesResponseType(typeof(PipelineResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PipelineResultDto>> GetPipelineResult(Guid projectId)
    {
        var result = await _pipelineService.GetPipelineResultAsync(projectId);
        
        if (result == null)
        {
            return NotFound(new { error = $"No completed pipeline found for project {projectId}" });
        }

        return Ok(result);
    }

    /// <summary>
    /// Submit a review decision for a pipeline stage
    /// </summary>
    [HttpPost("review")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitReview([FromBody] PipelineReviewDto review)
    {
        if (review.ProjectId == Guid.Empty)
        {
            return BadRequest("ProjectId is required");
        }

        try
        {
            var success = await _pipelineService.SubmitReviewAsync(review);
            
            if (success)
            {
                _logger.LogInformation("Review submitted for project {ProjectId} at stage {Stage}: {Decision}", 
                    review.ProjectId, review.Stage, review.Decision);
                return Ok(new { message = "Review submitted successfully" });
            }

            return BadRequest(new { error = "Failed to submit review" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit review for project {ProjectId}", review.ProjectId);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Cancel an active pipeline
    /// </summary>
    [HttpPost("cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelPipeline([FromBody] CancelPipelineDto request)
    {
        if (request.ProjectId == Guid.Empty)
        {
            return BadRequest("ProjectId is required");
        }

        try
        {
            var success = await _pipelineService.CancelPipelineAsync(request);
            
            if (success)
            {
                _logger.LogInformation("Pipeline cancelled for project {ProjectId}: {Reason}", 
                    request.ProjectId, request.Reason);
                return Ok(new { message = "Pipeline cancelled successfully" });
            }

            return BadRequest(new { error = "Failed to cancel pipeline" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel pipeline for project {ProjectId}", request.ProjectId);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Retry a failed or cancelled pipeline
    /// </summary>
    [HttpPost("retry")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<string>> RetryPipeline([FromBody] RetryPipelineDto request)
    {
        if (request.ProjectId == Guid.Empty)
        {
            return BadRequest("ProjectId is required");
        }

        try
        {
            var jobId = await _pipelineService.RetryPipelineAsync(request);
            _logger.LogInformation("Retrying pipeline for project {ProjectId} from stage {Stage} with job ID {JobId}", 
                request.ProjectId, request.FromStage, jobId);
            
            return Ok(new { jobId, message = "Pipeline retry started successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retry pipeline for project {ProjectId}", request.ProjectId);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get all active pipelines
    /// </summary>
    [HttpGet("active")]
    [ProducesResponseType(typeof(List<PipelineStatusDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PipelineStatusDto>>> GetActivePipelines()
    {
        var activePipelines = await _pipelineService.GetActivePipelinesAsync();
        return Ok(activePipelines);
    }

    /// <summary>
    /// Get pipeline statistics and analytics
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPipelineStats()
    {
        var activePipelines = await _pipelineService.GetActivePipelinesAsync();
        
        var stats = new
        {
            activePipelines = activePipelines.Count,
            inProgress = activePipelines.Count(p => p.Status == Core.Enums.PipelineStatus.InProgress),
            waitingForReview = activePipelines.Count(p => p.Status == Core.Enums.PipelineStatus.WaitingForReview),
            averageProgress = activePipelines.Any() ? activePipelines.Average(p => p.ProgressPercentage) : 0,
            stageDistribution = activePipelines.GroupBy(p => p.CurrentStage)
                .Select(g => new { stage = g.Key.ToString(), count = g.Count() })
                .ToList()
        };

        return Ok(stats);
    }
}