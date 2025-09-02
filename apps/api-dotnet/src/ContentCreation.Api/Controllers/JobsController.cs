using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.DTOs.Queue;
using Hangfire;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/jobs")]
[Authorize]
public class JobsController : ControllerBase
{
    private readonly IBackgroundJobService _backgroundJobService;
    private readonly IQueueManagementService _queueManagementService;
    private readonly ILogger<JobsController> _logger;

    public JobsController(
        IBackgroundJobService backgroundJobService,
        IQueueManagementService queueManagementService,
        ILogger<JobsController> logger)
    {
        _backgroundJobService = backgroundJobService;
        _queueManagementService = queueManagementService;
        _logger = logger;
    }

    /// <summary>
    /// Get queue statistics
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(QueueStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQueueStats([FromQuery] string? queue = null)
    {
        try
        {
            var stats = await _queueManagementService.GetQueueStatsAsync(queue);
            return Ok(new { success = true, data = stats });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving queue statistics");
            return StatusCode(500, new { error = "Failed to retrieve queue statistics" });
        }
    }

    /// <summary>
    /// Get pending jobs
    /// </summary>
    [HttpGet("pending")]
    [ProducesResponseType(typeof(List<JobDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingJobs([FromQuery] string? queue = null)
    {
        try
        {
            var jobs = await _queueManagementService.GetPendingJobsAsync(queue);
            return Ok(new { success = true, data = jobs, total = jobs.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pending jobs");
            return StatusCode(500, new { error = "Failed to retrieve pending jobs" });
        }
    }

    /// <summary>
    /// Get processing jobs
    /// </summary>
    [HttpGet("processing")]
    [ProducesResponseType(typeof(List<JobDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProcessingJobs([FromQuery] string? queue = null)
    {
        try
        {
            var jobs = await _queueManagementService.GetProcessingJobsAsync(queue);
            return Ok(new { success = true, data = jobs, total = jobs.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving processing jobs");
            return StatusCode(500, new { error = "Failed to retrieve processing jobs" });
        }
    }

    /// <summary>
    /// Get failed jobs
    /// </summary>
    [HttpGet("failed")]
    [ProducesResponseType(typeof(List<JobDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFailedJobs([FromQuery] string? queue = null)
    {
        try
        {
            var jobs = await _queueManagementService.GetFailedJobsAsync(queue);
            return Ok(new { success = true, data = jobs, total = jobs.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving failed jobs");
            return StatusCode(500, new { error = "Failed to retrieve failed jobs" });
        }
    }

    /// <summary>
    /// Get completed jobs
    /// </summary>
    [HttpGet("completed")]
    [ProducesResponseType(typeof(List<JobDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCompletedJobs([FromQuery] string? queue = null)
    {
        try
        {
            var jobs = await _queueManagementService.GetCompletedJobsAsync(queue);
            return Ok(new { success = true, data = jobs, total = jobs.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving completed jobs");
            return StatusCode(500, new { error = "Failed to retrieve completed jobs" });
        }
    }

    /// <summary>
    /// Get job details
    /// </summary>
    [HttpGet("{jobId}")]
    [ProducesResponseType(typeof(JobDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobDetails(string jobId)
    {
        try
        {
            var details = await _queueManagementService.GetJobDetailsAsync(jobId);
            return Ok(new { success = true, data = details });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Job with ID {jobId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving job details for {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to retrieve job details" });
        }
    }

    /// <summary>
    /// Get job status
    /// </summary>
    [HttpGet("{jobId}/status")]
    [ProducesResponseType(typeof(JobStatus), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobStatus(string jobId)
    {
        try
        {
            var status = await _queueManagementService.GetJobStatusAsync(jobId);
            return Ok(new { success = true, data = status });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Job with ID {jobId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving job status for {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to retrieve job status" });
        }
    }

    /// <summary>
    /// Requeue a failed job
    /// </summary>
    [HttpPost("{jobId}/requeue")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RequeueJob(string jobId)
    {
        try
        {
            var result = await _queueManagementService.RequeueJobAsync(jobId);
            if (result)
            {
                return Ok(new { success = true, message = $"Job {jobId} requeued successfully" });
            }
            else
            {
                return BadRequest(new { error = $"Failed to requeue job {jobId}" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requeuing job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to requeue job" });
        }
    }

    /// <summary>
    /// Delete a job
    /// </summary>
    [HttpDelete("{jobId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteJob(string jobId)
    {
        try
        {
            var result = await _queueManagementService.DeleteJobAsync(jobId);
            if (result)
            {
                return Ok(new { success = true, message = $"Job {jobId} deleted successfully" });
            }
            else
            {
                return BadRequest(new { error = $"Failed to delete job {jobId}" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to delete job" });
        }
    }

    /// <summary>
    /// Trigger transcript processing
    /// </summary>
    [HttpPost("process-transcript/{transcriptId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ProcessTranscript(string transcriptId)
    {
        try
        {
            await _backgroundJobService.ProcessTranscriptAsync(transcriptId);
            return Ok(new { 
                success = true, 
                message = $"Transcript {transcriptId} processing started",
                transcriptId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing transcript {TranscriptId}", transcriptId);
            return StatusCode(500, new { error = "Failed to process transcript" });
        }
    }

    /// <summary>
    /// Trigger insight generation
    /// </summary>
    [HttpPost("generate-insights/{transcriptId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateInsights(string transcriptId)
    {
        try
        {
            await _backgroundJobService.GenerateInsightsFromTranscriptAsync(transcriptId);
            return Ok(new { 
                success = true, 
                message = $"Insight generation started for transcript {transcriptId}",
                transcriptId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating insights for transcript {TranscriptId}", transcriptId);
            return StatusCode(500, new { error = "Failed to generate insights" });
        }
    }

    /// <summary>
    /// Trigger post generation
    /// </summary>
    [HttpPost("generate-posts/{insightId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GeneratePosts(string insightId)
    {
        try
        {
            await _backgroundJobService.GeneratePostsFromInsightAsync(insightId);
            return Ok(new { 
                success = true, 
                message = $"Post generation started for insight {insightId}",
                insightId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating posts for insight {InsightId}", insightId);
            return StatusCode(500, new { error = "Failed to generate posts" });
        }
    }

    /// <summary>
    /// Trigger post publishing
    /// </summary>
    [HttpPost("publish-post/{postId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> PublishPost(string postId)
    {
        try
        {
            await _backgroundJobService.PublishPostAsync(postId);
            return Ok(new { 
                success = true, 
                message = $"Post {postId} publishing started",
                postId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing post {PostId}", postId);
            return StatusCode(500, new { error = "Failed to publish post" });
        }
    }

    /// <summary>
    /// Trigger cleanup of old jobs
    /// </summary>
    [HttpPost("cleanup")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> CleanupOldJobs()
    {
        try
        {
            await _backgroundJobService.CleanupOldJobsAsync();
            return Ok(new { 
                success = true, 
                message = "Cleanup job started" 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting cleanup job");
            return StatusCode(500, new { error = "Failed to start cleanup" });
        }
    }

    /// <summary>
    /// Trigger archiving of completed projects
    /// </summary>
    [HttpPost("archive-projects")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ArchiveProjects()
    {
        try
        {
            await _backgroundJobService.ArchiveCompletedProjectsAsync();
            return Ok(new { 
                success = true, 
                message = "Archive job started" 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting archive job");
            return StatusCode(500, new { error = "Failed to start archiving" });
        }
    }
}