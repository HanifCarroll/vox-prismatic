using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.Interfaces;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly IPostStateService _postStateService;
    private readonly ILogger<PostsController> _logger;

    public PostsController(
        IPostService postService,
        IPostStateService postStateService,
        ILogger<PostsController> logger)
    {
        _postService = postService;
        _postStateService = postStateService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new post
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
    {
        try
        {
            var post = await _postService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetOne), new { id = post.Id }, post);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating post");
            return StatusCode(500, new { error = "Failed to create post" });
        }
    }

    /// <summary>
    /// Get all posts
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] PostFilterDto? filter = null)
    {
        try
        {
            var posts = await _postService.GetAllAsync(filter);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving posts");
            return StatusCode(500, new { error = "Failed to retrieve posts" });
        }
    }

    /// <summary>
    /// Get post counts by status
    /// </summary>
    [HttpGet("status-counts")]
    [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatusCounts()
    {
        try
        {
            var counts = await _postService.GetStatusCountsAsync();
            return Ok(counts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving status counts");
            return StatusCode(500, new { error = "Failed to retrieve status counts" });
        }
    }

    /// <summary>
    /// Get post counts by platform
    /// </summary>
    [HttpGet("platform-counts")]
    [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlatformCounts()
    {
        try
        {
            var counts = await _postService.GetPlatformCountsAsync();
            return Ok(counts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving platform counts");
            return StatusCode(500, new { error = "Failed to retrieve platform counts" });
        }
    }

    /// <summary>
    /// Get posts for a specific insight
    /// </summary>
    [HttpGet("insight/{insightId}")]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByInsight(string insightId)
    {
        try
        {
            var posts = await _postService.GetByInsightIdAsync(insightId);
            return Ok(new { data = posts, total = posts.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving posts for insight {InsightId}", insightId);
            return StatusCode(500, new { error = "Failed to retrieve posts" });
        }
    }

    /// <summary>
    /// Get posts for a specific project
    /// </summary>
    [HttpGet("project/{projectId}")]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProject(string projectId)
    {
        try
        {
            var posts = await _postService.GetByProjectIdAsync(projectId);
            return Ok(new { data = posts, total = posts.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving posts for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to retrieve posts" });
        }
    }

    /// <summary>
    /// Get a specific post
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOne(string id, [FromQuery] bool includeSchedule = false)
    {
        try
        {
            var post = await _postService.GetByIdAsync(id, includeSchedule);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving post {PostId}", id);
            return StatusCode(500, new { error = "Failed to retrieve post" });
        }
    }

    /// <summary>
    /// Update a post
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdatePostDto dto)
    {
        try
        {
            var post = await _postService.UpdateAsync(id, dto);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating post {PostId}", id);
            return StatusCode(500, new { error = "Failed to update post" });
        }
    }

    /// <summary>
    /// Delete a post
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            await _postService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting post {PostId}", id);
            return StatusCode(500, new { error = "Failed to delete post" });
        }
    }

    /// <summary>
    /// Submit post for review
    /// </summary>
    [HttpPost("{id}/submit")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitForReview(string id)
    {
        try
        {
            var post = await _postStateService.SubmitForReviewAsync(id);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting post {PostId} for review", id);
            return StatusCode(500, new { error = "Failed to submit post for review" });
        }
    }

    /// <summary>
    /// Approve a post
    /// </summary>
    [HttpPost("{id}/approve")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ApprovePost(string id)
    {
        try
        {
            var approvedBy = User.Identity?.Name ?? "system";
            var post = await _postStateService.ApprovePostAsync(id, approvedBy);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving post {PostId}", id);
            return StatusCode(500, new { error = "Failed to approve post" });
        }
    }

    /// <summary>
    /// Reject a post
    /// </summary>
    [HttpPost("{id}/reject")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RejectPost(string id, [FromBody] RejectPostDto? dto = null)
    {
        try
        {
            var rejectedBy = dto?.RejectedBy ?? User.Identity?.Name ?? "system";
            var reason = dto?.Reason ?? "Post rejected during review";
            var post = await _postStateService.RejectPostAsync(id, rejectedBy, reason);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting post {PostId}", id);
            return StatusCode(500, new { error = "Failed to reject post" });
        }
    }

    /// <summary>
    /// Archive a post
    /// </summary>
    [HttpPost("{id}/archive")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ArchivePost(string id, [FromBody] ArchivePostDto? dto = null)
    {
        try
        {
            var reason = dto?.Reason ?? "Post archived";
            var post = await _postStateService.ArchivePostAsync(id, reason);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving post {PostId}", id);
            return StatusCode(500, new { error = "Failed to archive post" });
        }
    }

    /// <summary>
    /// Schedule a post
    /// </summary>
    [HttpPost("{id}/schedule")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SchedulePost(string id, [FromBody] SchedulePostDto dto)
    {
        try
        {
            var post = await _postStateService.SchedulePostAsync(id, dto.ScheduledTime, dto.TimeZone);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling post {PostId}", id);
            return StatusCode(500, new { error = "Failed to schedule post" });
        }
    }

    /// <summary>
    /// Unschedule a post
    /// </summary>
    [HttpPost("{id}/unschedule")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UnschedulePost(string id)
    {
        try
        {
            var post = await _postStateService.UnschedulePostAsync(id);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unscheduling post {PostId}", id);
            return StatusCode(500, new { error = "Failed to unschedule post" });
        }
    }

    /// <summary>
    /// Perform bulk operations on posts
    /// </summary>
    [HttpPost("bulk")]
    [ProducesResponseType(typeof(BulkOperationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkOperation([FromBody] BulkPostOperationDto dto)
    {
        try
        {
            var result = await _postService.BulkOperationAsync(dto);
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
    /// Get available state transitions for a post
    /// </summary>
    [HttpGet("{id}/available-actions")]
    [ProducesResponseType(typeof(AvailableActionsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvailableActions(string id)
    {
        try
        {
            var actions = await _postStateService.GetAvailableActionsAsync(id);
            return Ok(actions);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {id} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available actions for post {PostId}", id);
            return StatusCode(500, new { error = "Failed to get available actions" });
        }
    }
}