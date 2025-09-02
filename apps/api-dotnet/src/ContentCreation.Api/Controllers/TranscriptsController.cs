using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.Interfaces;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId}/transcripts")]
[Authorize]
public class TranscriptsController : ControllerBase
{
    private readonly ITranscriptService _transcriptService;
    private readonly ITranscriptStateService _transcriptStateService;
    private readonly ILogger<TranscriptsController> _logger;

    public TranscriptsController(
        ITranscriptService transcriptService,
        ITranscriptStateService transcriptStateService,
        ILogger<TranscriptsController> logger)
    {
        _transcriptService = transcriptService;
        _transcriptStateService = transcriptStateService;
        _logger = logger;
    }

    /// <summary>
    /// Get all transcripts
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<TranscriptDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] TranscriptFilterDto? filter = null)
    {
        try
        {
            var transcripts = await _transcriptService.GetAllAsync(filter);
            return Ok(new { success = true, data = transcripts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transcripts");
            return StatusCode(500, new { error = "Failed to retrieve transcripts" });
        }
    }

    /// <summary>
    /// Get transcript statistics
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(TranscriptStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var stats = await _transcriptService.GetStatsAsync();
            return Ok(new { success = true, data = stats });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transcript statistics");
            return StatusCode(500, new { error = "Failed to retrieve statistics" });
        }
    }

    /// <summary>
    /// Get transcript by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        try
        {
            var transcript = await _transcriptService.GetByIdAsync(id);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to retrieve transcript" });
        }
    }

    /// <summary>
    /// Get transcripts for a specific project
    /// </summary>
    [HttpGet("project/{projectId}")]
    [ProducesResponseType(typeof(List<TranscriptDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProject(string projectId)
    {
        try
        {
            var transcripts = await _transcriptService.GetByProjectIdAsync(projectId);
            return Ok(new { success = true, data = transcripts, total = transcripts.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transcripts for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to retrieve transcripts" });
        }
    }

    /// <summary>
    /// Create a new transcript with automatic processing
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CreateTranscriptResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTranscriptDto dto)
    {
        try
        {
            var transcript = await _transcriptService.CreateAsync(dto);
            
            _logger.LogInformation("Transcript {TranscriptId} created successfully. Processing pipeline started automatically", 
                transcript.Id);

            var response = new CreateTranscriptResponseDto
            {
                Success = true,
                Data = transcript,
                Processing = new ProcessingInfoDto
                {
                    Status = "started",
                    Message = "Processing pipeline started automatically via events",
                    Workflow = "transcript.uploaded event → cleaning → transcript.processing.completed event → insight extraction"
                }
            };

            return CreatedAtAction(nameof(GetById), new { id = transcript.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transcript");
            return StatusCode(500, new { error = "Failed to create transcript" });
        }
    }

    /// <summary>
    /// Update transcript by ID
    /// </summary>
    [HttpPatch("{id}")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateTranscriptDto dto)
    {
        try
        {
            var transcript = await _transcriptService.UpdateAsync(id, dto);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to update transcript" });
        }
    }

    /// <summary>
    /// Delete transcript by ID
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            await _transcriptService.DeleteAsync(id);
            return Ok(new { success = true, message = $"Transcript {id} deleted successfully" });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to delete transcript" });
        }
    }

    /// <summary>
    /// Start processing a transcript
    /// </summary>
    [HttpPost("{id}/process")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StartProcessing(string id)
    {
        try
        {
            var transcript = await _transcriptStateService.StartProcessingAsync(id);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting processing for transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to start processing" });
        }
    }

    /// <summary>
    /// Mark transcript as cleaned
    /// </summary>
    [HttpPost("{id}/mark-cleaned")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkCleaned(string id, [FromBody] MarkCleanedDto? dto = null)
    {
        try
        {
            var transcript = await _transcriptStateService.MarkCleanedAsync(id, dto?.CleanedContent);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking transcript {TranscriptId} as cleaned", id);
            return StatusCode(500, new { error = "Failed to mark transcript as cleaned" });
        }
    }

    /// <summary>
    /// Mark transcript as failed
    /// </summary>
    [HttpPost("{id}/mark-failed")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkFailed(string id, [FromBody] MarkFailedDto dto)
    {
        try
        {
            var transcript = await _transcriptStateService.MarkFailedAsync(id, dto.ErrorMessage);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking transcript {TranscriptId} as failed", id);
            return StatusCode(500, new { error = "Failed to mark transcript as failed" });
        }
    }

    /// <summary>
    /// Mark insights generated for transcript
    /// </summary>
    [HttpPost("{id}/mark-insights-generated")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkInsightsGenerated(string id)
    {
        try
        {
            var transcript = await _transcriptStateService.MarkInsightsGeneratedAsync(id);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking insights generated for transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to mark insights generated" });
        }
    }

    /// <summary>
    /// Mark posts created for transcript
    /// </summary>
    [HttpPost("{id}/mark-posts-created")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkPostsCreated(string id)
    {
        try
        {
            var transcript = await _transcriptStateService.MarkPostsCreatedAsync(id);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking posts created for transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to mark posts created" });
        }
    }

    /// <summary>
    /// Retry processing for a failed transcript
    /// </summary>
    [HttpPost("{id}/retry")]
    [ProducesResponseType(typeof(TranscriptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Retry(string id)
    {
        try
        {
            var transcript = await _transcriptStateService.RetryProcessingAsync(id);
            return Ok(new { success = true, data = transcript });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Transcript with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrying processing for transcript {TranscriptId}", id);
            return StatusCode(500, new { error = "Failed to retry processing" });
        }
    }

    /// <summary>
    /// Get transcripts ready for processing
    /// </summary>
    [HttpGet("ready-for-processing")]
    [ProducesResponseType(typeof(List<TranscriptDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReadyForProcessing()
    {
        try
        {
            var transcripts = await _transcriptService.GetTranscriptsForProcessingAsync();
            return Ok(new { success = true, data = transcripts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transcripts ready for processing");
            return StatusCode(500, new { error = "Failed to retrieve transcripts" });
        }
    }
}