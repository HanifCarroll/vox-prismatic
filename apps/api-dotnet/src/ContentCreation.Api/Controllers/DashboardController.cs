using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs.Dashboard;
using ContentCreation.Core.Interfaces;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        IDashboardService dashboardService,
        ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive dashboard data
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(DashboardDataDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardData()
    {
        try
        {
            var data = await _dashboardService.GetDashboardDataAsync();
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard data");
            return StatusCode(500, new { error = "Failed to retrieve dashboard data" });
        }
    }

    /// <summary>
    /// Get dashboard counts
    /// </summary>
    [HttpGet("counts")]
    [ProducesResponseType(typeof(DashboardCountsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCounts()
    {
        try
        {
            var counts = await _dashboardService.GetCountsAsync();
            return Ok(counts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard counts");
            return StatusCode(500, new { error = "Failed to retrieve counts" });
        }
    }

    /// <summary>
    /// Get recent activity
    /// </summary>
    [HttpGet("activity")]
    [ProducesResponseType(typeof(List<DashboardActivityDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActivity([FromQuery] int limit = 10)
    {
        try
        {
            var activity = await _dashboardService.GetActivityAsync(limit);
            return Ok(activity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving activity");
            return StatusCode(500, new { error = "Failed to retrieve activity" });
        }
    }

    /// <summary>
    /// Get actionable items that need user attention
    /// </summary>
    [HttpGet("actionable")]
    [ProducesResponseType(typeof(DashboardActionableDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActionableItems()
    {
        try
        {
            var items = await _dashboardService.GetActionableItemsAsync();
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving actionable items");
            return StatusCode(500, new { error = "Failed to retrieve actionable items" });
        }
    }

    /// <summary>
    /// Get publishing schedule
    /// </summary>
    [HttpGet("publishing-schedule")]
    [ProducesResponseType(typeof(PublishingScheduleDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPublishingSchedule()
    {
        try
        {
            var schedule = await _dashboardService.GetPublishingScheduleAsync();
            return Ok(schedule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving publishing schedule");
            return StatusCode(500, new { error = "Failed to retrieve publishing schedule" });
        }
    }

    /// <summary>
    /// Get dashboard statistics
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(DashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var stats = await _dashboardService.GetStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving statistics");
            return StatusCode(500, new { error = "Failed to retrieve statistics" });
        }
    }

    /// <summary>
    /// Get workflow pipeline statistics
    /// </summary>
    [HttpGet("workflow-pipeline")]
    [ProducesResponseType(typeof(WorkflowPipelineStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowPipelineStats()
    {
        try
        {
            var stats = await _dashboardService.GetWorkflowPipelineStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving workflow pipeline stats");
            return StatusCode(500, new { error = "Failed to retrieve workflow pipeline stats" });
        }
    }

    /// <summary>
    /// Get high-level project status across all projects
    /// </summary>
    [HttpGet("project-overview")]
    [ProducesResponseType(typeof(ProjectOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjectOverview()
    {
        try
        {
            var overview = await _dashboardService.GetProjectOverviewAsync();
            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project overview");
            return StatusCode(500, new { error = "Failed to retrieve project overview" });
        }
    }

    /// <summary>
    /// Get projects requiring attention
    /// </summary>
    [HttpGet("action-items")]
    [ProducesResponseType(typeof(List<ProjectActionItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActionItems()
    {
        try
        {
            var items = await _dashboardService.GetActionItemsAsync();
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving action items");
            return StatusCode(500, new { error = "Failed to retrieve action items" });
        }
    }
}