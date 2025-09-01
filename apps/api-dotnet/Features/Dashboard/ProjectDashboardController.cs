using Microsoft.AspNetCore.Mvc;
using ContentCreation.Api.Features.Projects;
using ContentCreation.Api.Features.Projects.DTOs;
using ContentCreation.Api.Features.Projects.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace ContentCreation.Api.Features.Dashboard;

[ApiController]
[Route("dashboard")]
[Authorize]
public class ProjectDashboardController : ControllerBase
{
    private readonly IContentProjectService _projectService;
    private readonly ILogger<ProjectDashboardController> _logger;

    public ProjectDashboardController(
        IContentProjectService projectService,
        ILogger<ProjectDashboardController> logger)
    {
        _projectService = projectService;
        _logger = logger;
    }

    /// <summary>
    /// High-level project status across all projects
    /// </summary>
    [HttpGet("project-overview")]
    [ProducesResponseType(typeof(ProjectOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProjectOverview()
    {
        try
        {
            var userId = User.Identity?.Name;
            var countsByStage = await _projectService.GetProjectCountsByStageAsync(userId);
            
            var overview = new ProjectOverviewDto
            {
                StageCounts = countsByStage,
                TotalProjects = countsByStage.Values.Sum(),
                RequiringAttention = countsByStage.GetValueOrDefault(ProjectLifecycleStage.InsightsReady, 0) +
                                    countsByStage.GetValueOrDefault(ProjectLifecycleStage.PostsGenerated, 0) +
                                    countsByStage.GetValueOrDefault(ProjectLifecycleStage.PostsApproved, 0)
            };
            
            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving project overview");
            return StatusCode(500, new { error = "Failed to retrieve project overview" });
        }
    }

    /// <summary>
    /// Projects requiring attention
    /// </summary>
    [HttpGet("action-items")]
    [ProducesResponseType(typeof(List<ActionItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActionItems()
    {
        try
        {
            var userId = User.Identity?.Name;
            var projects = await _projectService.GetActionableProjectsAsync(userId);
            
            var actionItems = projects.Select(p => new ActionItemDto
            {
                ProjectId = p.Id,
                ProjectTitle = p.Title,
                CurrentStage = p.CurrentStage,
                RequiredAction = GetRequiredAction(p.CurrentStage),
                Priority = GetActionPriority(p.CurrentStage),
                LastActivityAt = p.LastActivityAt,
                Metrics = p.Metrics
            })
            .OrderBy(a => a.Priority)
            .ThenBy(a => a.LastActivityAt)
            .ToList();
            
            return Ok(actionItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving action items");
            return StatusCode(500, new { error = "Failed to retrieve action items" });
        }
    }

    private string GetRequiredAction(string stage)
    {
        return stage switch
        {
            ProjectLifecycleStage.InsightsReady => "Review and approve insights",
            ProjectLifecycleStage.PostsGenerated => "Review and approve posts",
            ProjectLifecycleStage.PostsApproved => "Schedule posts for publishing",
            _ => "No action required"
        };
    }

    private int GetActionPriority(string stage)
    {
        return stage switch
        {
            ProjectLifecycleStage.PostsApproved => 1,
            ProjectLifecycleStage.PostsGenerated => 2,
            ProjectLifecycleStage.InsightsReady => 3,
            _ => 99
        };
    }
}

public class ProjectOverviewDto
{
    public Dictionary<string, int> StageCounts { get; set; } = new();
    public int TotalProjects { get; set; }
    public int RequiringAttention { get; set; }
}

public class ActionItemDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectTitle { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public string RequiredAction { get; set; } = string.Empty;
    public int Priority { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public ProjectMetricsDto Metrics { get; set; } = new();
}