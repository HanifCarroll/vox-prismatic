using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Api.Features.Posts.DTOs;
using ContentCreation.Api.Features.Posts.Interfaces;
using ContentCreation.Api.Features.Projects.Interfaces;

namespace ContentCreation.Api.Features.Posts;

[ApiController]
[Route("projects/{projectId}/posts")]
[Authorize]
public class ProjectPostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly IContentProjectService _projectService;
    private readonly ILogger<ProjectPostsController> _logger;

    public ProjectPostsController(
        IPostService postService,
        IContentProjectService projectService,
        ILogger<ProjectPostsController> logger)
    {
        _postService = postService;
        _projectService = projectService;
        _logger = logger;
    }

    /// <summary>
    /// Get all posts for a specific project
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectPosts(
        string projectId,
        [FromQuery] PostFilterDto? filter = null)
    {
        try
        {
            // Verify project exists
            await _projectService.GetProjectByIdAsync(projectId);
            
            filter ??= new PostFilterDto();
            filter.ProjectId = projectId;
            
            var (posts, totalCount) = await _postService.GetPostsAsync(filter);
            
            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", filter.Page.ToString());
            Response.Headers.Append("X-Page-Size", filter.PageSize.ToString());
            
            return Ok(posts);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Project with ID {projectId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving posts for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to retrieve posts" });
        }
    }

    /// <summary>
    /// Get a specific post within a project
    /// </summary>
    [HttpGet("{postId}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectPost(string projectId, string postId)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to retrieve post" });
        }
    }

    /// <summary>
    /// Create a new post for a project
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateProjectPost(
        string projectId,
        [FromBody] CreatePostDto dto)
    {
        try
        {
            // Verify project exists
            await _projectService.GetProjectByIdAsync(projectId);
            
            var post = await _postService.CreatePostAsync(projectId, dto);
            
            return CreatedAtAction(
                nameof(GetProjectPost),
                new { projectId, postId = post.Id },
                post);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating post for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to create post" });
        }
    }

    /// <summary>
    /// Update a post within a project
    /// </summary>
    [HttpPatch("{postId}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProjectPost(
        string projectId,
        string postId,
        [FromBody] UpdatePostDto dto)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            var updatedPost = await _postService.UpdatePostAsync(postId, dto);
            return Ok(updatedPost);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to update post" });
        }
    }

    /// <summary>
    /// Delete a post from a project
    /// </summary>
    [HttpDelete("{postId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProjectPost(string projectId, string postId)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            await _postService.DeletePostAsync(postId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to delete post" });
        }
    }

    /// <summary>
    /// Bulk update posts in a project
    /// </summary>
    [HttpPatch("bulk")]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BulkUpdateProjectPosts(
        string projectId,
        [FromBody] BulkUpdatePostsDto dto)
    {
        try
        {
            // Verify project exists
            await _projectService.GetProjectByIdAsync(projectId);
            
            // Verify all posts belong to the project
            var posts = await _postService.GetPostsByIdsAsync(dto.PostIds);
            var invalidPosts = posts
                .Where(p => p.ProjectId != projectId)
                .Select(p => p.Id)
                .ToList();
            
            if (invalidPosts.Any())
            {
                return BadRequest(new 
                { 
                    error = "Some posts do not belong to this project",
                    invalidPostIds = invalidPosts
                });
            }
            
            var updatedPosts = await _postService.BulkUpdatePostsAsync(dto);
            return Ok(updatedPosts);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk updating posts for project {ProjectId}", projectId);
            return StatusCode(500, new { error = "Failed to bulk update posts" });
        }
    }

    /// <summary>
    /// Approve a post
    /// </summary>
    [HttpPost("{postId}/approve")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApprovePost(
        string projectId,
        string postId,
        [FromBody] ApprovePostDto? dto = null)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            var updateDto = new UpdatePostDto
            {
                IsApproved = true,
                Status = "approved",
                ReviewNotes = dto?.ReviewNotes
            };
            
            var updatedPost = await _postService.UpdatePostAsync(postId, updateDto);
            return Ok(updatedPost);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to approve post" });
        }
    }

    /// <summary>
    /// Reject a post
    /// </summary>
    [HttpPost("{postId}/reject")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectPost(
        string projectId,
        string postId,
        [FromBody] RejectPostDto dto)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            var updateDto = new UpdatePostDto
            {
                IsApproved = false,
                Status = "rejected",
                ReviewNotes = dto.Reason
            };
            
            var updatedPost = await _postService.UpdatePostAsync(postId, updateDto);
            return Ok(updatedPost);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to reject post" });
        }
    }

    /// <summary>
    /// Schedule a post for publishing
    /// </summary>
    [HttpPost("{postId}/schedule")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SchedulePost(
        string projectId,
        string postId,
        [FromBody] SchedulePostDto dto)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            if (!post.IsApproved)
            {
                return BadRequest(new { error = "Post must be approved before scheduling" });
            }
            
            var scheduledPost = await _postService.SchedulePostAsync(dto);
            return Ok(scheduledPost);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to schedule post" });
        }
    }

    /// <summary>
    /// Publish a post immediately
    /// </summary>
    [HttpPost("{postId}/publish")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PublishPost(
        string projectId,
        string postId)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            if (!post.IsApproved)
            {
                return BadRequest(new { error = "Post must be approved before publishing" });
            }
            
            var publishedPost = await _postService.PublishPostAsync(postId);
            return Ok(publishedPost);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing post {PostId} for project {ProjectId}", 
                postId, projectId);
            return StatusCode(500, new { error = "Failed to publish post" });
        }
    }

    /// <summary>
    /// Get post performance metrics
    /// </summary>
    [HttpGet("{postId}/performance")]
    [ProducesResponseType(typeof(PostPerformanceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPostPerformance(string projectId, string postId)
    {
        try
        {
            var post = await _postService.GetPostByIdAsync(postId);
            
            if (post.ProjectId != projectId)
            {
                return NotFound(new { error = $"Post {postId} not found in project {projectId}" });
            }
            
            var performance = await _postService.GetPostPerformanceAsync(postId);
            return Ok(performance);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = $"Post with ID {postId} not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving performance for post {PostId}", postId);
            return StatusCode(500, new { error = "Failed to retrieve post performance" });
        }
    }
}

public class ApprovePostDto
{
    public string? ReviewNotes { get; set; }
}

public class RejectPostDto
{
    public string Reason { get; set; } = string.Empty;
}