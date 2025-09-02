using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.Interfaces;
using ContentCreation.Api.Controllers.Base;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId}/posts")]
[Authorize]
public class PostsController : ApiControllerBase
{
    private readonly IPostService _postService;
    private readonly IPostStateService _postStateService;

    public PostsController(
        IPostService postService,
        IPostStateService postStateService,
        ILogger<PostsController> logger) : base(logger)
    {
        _postService = postService;
        _postStateService = postStateService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePostDto dto) =>
        await ExecuteWithCreatedAsync(
            () => _postService.CreateAsync(dto),
            post => new { id = post.Id },
            nameof(GetOne),
            "Failed to create post");

    [HttpGet]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] PostFilterDto? filter = null) =>
        await ExecuteAsync(
            () => _postService.GetAllAsync(filter),
            "Failed to retrieve posts");

    [HttpGet("status-counts")]
    [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatusCounts() =>
        await ExecuteAsync(
            () => _postService.GetStatusCountsAsync(),
            "Failed to retrieve status counts");

    [HttpGet("platform-counts")]
    [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlatformCounts() =>
        await ExecuteAsync(
            () => _postService.GetPlatformCountsAsync(),
            "Failed to retrieve platform counts");

    [HttpGet("insight/{insightId}")]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByInsight(string insightId) =>
        await ExecuteAsync(
            async () =>
            {
                var posts = await _postService.GetByInsightIdAsync(insightId);
                return new { data = posts, total = posts.Count };
            },
            $"Failed to retrieve posts for insight {insightId}");

    [HttpGet("project/{projectId}")]
    [ProducesResponseType(typeof(List<PostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByProject(string projectId) =>
        await ExecuteAsync(
            async () =>
            {
                var posts = await _postService.GetByProjectIdAsync(projectId);
                return new { data = posts, total = posts.Count };
            },
            $"Failed to retrieve posts for project {projectId}");

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOne(string id, [FromQuery] bool includeSchedule = false) =>
        await ExecuteAsync(
            () => _postService.GetByIdAsync(id, includeSchedule),
            $"Failed to retrieve post {id}");

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdatePostDto dto) =>
        await ExecuteAsync(
            () => _postService.UpdateAsync(id, dto),
            $"Failed to update post {id}");

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(string id) =>
        await ExecuteNoContentAsync(
            () => _postService.DeleteAsync(id),
            $"Failed to delete post {id}");

    [HttpPost("{id}/submit")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitForReview(string id) =>
        await ExecuteAsync(
            () => _postStateService.SubmitForReviewAsync(id),
            $"Failed to submit post {id} for review");

    [HttpPost("{id}/approve")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ApprovePost(string id) =>
        await ExecuteAsync(
            () => _postStateService.ApprovePostAsync(id, GetCurrentUserId()),
            $"Failed to approve post {id}");

    [HttpPost("{id}/reject")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RejectPost(string id, [FromBody] RejectPostDto? dto = null) =>
        await ExecuteAsync(
            () => _postStateService.RejectPostAsync(
                id, 
                dto?.RejectedBy ?? GetCurrentUserId(), 
                dto?.Reason ?? "Post rejected during review"),
            $"Failed to reject post {id}");

    [HttpPost("{id}/archive")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ArchivePost(string id, [FromBody] ArchivePostDto? dto = null) =>
        await ExecuteAsync(
            () => _postStateService.ArchivePostAsync(id, dto?.Reason ?? "Post archived"),
            $"Failed to archive post {id}");

    [HttpPost("{id}/schedule")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SchedulePost(string id, [FromBody] SchedulePostDto dto) =>
        await ExecuteAsync(
            () => _postStateService.SchedulePostAsync(id, dto.ScheduledTime, dto.TimeZone),
            $"Failed to schedule post {id}");

    [HttpPost("{id}/unschedule")]
    [ProducesResponseType(typeof(PostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UnschedulePost(string id) =>
        await ExecuteAsync(
            () => _postStateService.UnschedulePostAsync(id),
            $"Failed to unschedule post {id}");

    [HttpPost("bulk")]
    [ProducesResponseType(typeof(BulkOperationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkOperation([FromBody] BulkPostOperationDto dto) =>
        await ExecuteAsync(
            () => _postService.BulkOperationAsync(dto),
            "Failed to perform bulk operation");

    [HttpGet("{id}/available-actions")]
    [ProducesResponseType(typeof(AvailableActionsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvailableActions(string id) =>
        await ExecuteAsync(
            () => _postStateService.GetAvailableActionsAsync(id),
            $"Failed to get available actions for post {id}");
}