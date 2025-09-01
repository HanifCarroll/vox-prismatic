using ContentCreation.Api.Features.Transcripts.DTOs;
using ContentCreation.Api.Features.Transcripts.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ContentCreation.Api.Features.Transcripts;

[ApiController]
[Route("[controller]")]
public class TranscriptsController : ControllerBase
{
    private readonly ITranscriptService _transcriptService;
    private readonly ILogger<TranscriptsController> _logger;

    public TranscriptsController(
        ITranscriptService transcriptService,
        ILogger<TranscriptsController> logger)
    {
        _transcriptService = transcriptService;
        _logger = logger;
    }

    /// <summary>
    /// Get all transcripts
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TranscriptDto>>> GetTranscripts()
    {
        var transcripts = await _transcriptService.GetAllAsync();
        return Ok(transcripts);
    }

    /// <summary>
    /// Get a specific transcript by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TranscriptDto>> GetTranscript(string id)
    {
        var transcript = await _transcriptService.GetByIdAsync(id);
        if (transcript == null)
        {
            return NotFound();
        }
        return Ok(transcript);
    }

    /// <summary>
    /// Create a new transcript
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TranscriptDto>> CreateTranscript([FromBody] CreateTranscriptDto dto)
    {
        var transcript = await _transcriptService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetTranscript), new { id = transcript.Id }, transcript);
    }

    /// <summary>
    /// Update an existing transcript
    /// </summary>
    [HttpPatch("{id}")]
    public async Task<ActionResult<TranscriptDto>> UpdateTranscript(string id, [FromBody] UpdateTranscriptDto dto)
    {
        var transcript = await _transcriptService.UpdateAsync(id, dto);
        if (transcript == null)
        {
            return NotFound();
        }
        return Ok(transcript);
    }

    /// <summary>
    /// Delete a transcript
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTranscript(string id)
    {
        var result = await _transcriptService.DeleteAsync(id);
        if (!result)
        {
            return NotFound();
        }
        return NoContent();
    }

    /// <summary>
    /// Get insights for a transcript
    /// </summary>
    [HttpGet("{id}/insights")]
    public async Task<ActionResult<IEnumerable<Insights.DTOs.InsightDto>>> GetTranscriptInsights(string id)
    {
        var insights = await _transcriptService.GetInsightsAsync(id);
        return Ok(insights);
    }
}