using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.StateMachine;
using AutoMapper;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId}/[action]")]
[Authorize]
public class ProjectActionsController : ControllerBase
{
    private readonly IProjectLifecycleService _lifecycleService;
    private readonly IContentProjectService _projectService;
    private readonly IMapper _mapper;
    private readonly ILogger<ProjectActionsController> _logger;
    
    public ProjectActionsController(
        IProjectLifecycleService lifecycleService,
        IContentProjectService projectService,
        IMapper mapper,
        ILogger<ProjectActionsController> logger)
    {
        _lifecycleService = lifecycleService;
        _projectService = projectService;
        _mapper = mapper;
        _logger = logger;
    }
    
    [HttpGet("state")]
    [ProducesResponseType(typeof(ProjectStateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectStateDto>> GetProjectState(string projectId)
    {
        try
        {
            var project = await _projectService.GetProjectByIdAsync(projectId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            var progress = await _lifecycleService.CalculateProjectProgressAsync(projectId);
            
            var stateMachine = new ProjectStateMachine(project.CurrentStage);
            
            var stateDto = new ProjectStateDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                OverallProgress = progress,
                AvailableActions = availableActions,
                RequiresUserAction = stateMachine.RequiresUserAction(),
                IsInFinalState = stateMachine.IsInFinalState(),
                Metrics = _mapper.Map<ProjectMetricsDto>(project.Metrics)
            };
            
            return Ok(stateDto);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    [HttpPost("process-content")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> ProcessContent(
        string projectId,
        [FromBody] ProcessContentDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.ProcessContentAsync(projectId, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = "Content processing started successfully",
                Success = true,
                ActionData = new { jobQueued = true }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("extract-insights")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> ExtractInsights(
        string projectId,
        [FromBody] ExtractInsightsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.ExtractInsightsAsync(projectId, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = "Insight extraction started successfully",
                Success = true,
                ActionData = new { maxInsights = dto.MaxInsights, minScore = dto.MinScore }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("generate-posts")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> GeneratePosts(
        string projectId,
        [FromBody] GeneratePostsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.GeneratePostsAsync(projectId, dto.InsightIds, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = "Post generation started successfully",
                Success = true,
                ActionData = new 
                { 
                    insightCount = dto.InsightIds?.Count ?? previousProject.Metrics?.InsightsApproved ?? 0,
                    platforms = dto?.Platforms ?? new List<string>() 
                }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("schedule-posts")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> SchedulePosts(
        string projectId,
        [FromBody] SchedulePostsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.SchedulePostsAsync(projectId, dto.PostIds, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            await _lifecycleService.UpdateProjectMetricsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = $"{project.Metrics.PostsScheduled} posts scheduled successfully",
                Success = true,
                ActionData = new 
                { 
                    postsScheduled = project.Metrics.PostsScheduled,
                    useOptimalTiming = dto.UseOptimalTiming 
                }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("publish-now")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> PublishNow(
        string projectId,
        [FromBody] PublishNowDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.PublishNowAsync(projectId, dto.PostIds, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = $"Publishing {dto.PostIds.Count} posts immediately",
                Success = true,
                ActionData = new { postsToPublish = dto.PostIds.Count }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("approve-insights")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> ApproveInsights(
        string projectId,
        [FromBody] ApproveInsightsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.ApproveInsightsAsync(projectId, dto.InsightIds, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            await _lifecycleService.UpdateProjectMetricsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = $"{dto.InsightIds.Count} insights approved",
                Success = true,
                ActionData = new 
                { 
                    approvedCount = dto.InsightIds.Count,
                    totalApproved = project.Metrics.InsightsApproved 
                }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("reject-insights")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> RejectInsights(
        string projectId,
        [FromBody] RejectInsightsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.RejectInsightsAsync(projectId, dto.InsightIds, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            await _lifecycleService.UpdateProjectMetricsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = $"{dto.InsightIds.Count} insights rejected",
                Success = true,
                ActionData = new 
                { 
                    rejectedCount = dto.InsightIds.Count,
                    totalRejected = project.Metrics.InsightsRejected 
                }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    [HttpPost("approve-posts")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> ApprovePosts(
        string projectId,
        [FromBody] ApprovePostsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.ApprovePostsAsync(projectId, dto.PostIds, userId);
            
            if (dto.AutoSchedule && project.CurrentStage == "posts_approved")
            {
                project = await _lifecycleService.SchedulePostsAsync(projectId, dto.PostIds, userId);
            }
            
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            await _lifecycleService.UpdateProjectMetricsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = dto.AutoSchedule 
                    ? $"{dto.PostIds.Count} posts approved and scheduled"
                    : $"{dto.PostIds.Count} posts approved",
                Success = true,
                ActionData = new 
                { 
                    approvedCount = dto.PostIds.Count,
                    totalApproved = project.Metrics.PostsApproved,
                    autoScheduled = dto.AutoSchedule
                }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("reject-posts")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> RejectPosts(
        string projectId,
        [FromBody] RejectPostsDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.RejectPostsAsync(projectId, dto.PostIds, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            await _lifecycleService.UpdateProjectMetricsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = $"{dto.PostIds.Count} posts rejected",
                Success = true,
                ActionData = new 
                { 
                    rejectedCount = dto.PostIds.Count,
                    regenerate = dto.RegenerateFromInsights 
                }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    [HttpPost("archive")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> ArchiveProject(
        string projectId,
        [FromBody] ArchiveProjectDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.ArchiveProjectAsync(projectId, userId);
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = "Project archived successfully",
                Success = true,
                ActionData = new { reason = dto.ArchiveReason }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpPost("restore")]
    [ProducesResponseType(typeof(ProjectActionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectActionResultDto>> RestoreProject(
        string projectId,
        [FromBody] RestoreProjectDto dto)
    {
        try
        {
            var userId = GetUserId();
            var previousProject = await _projectService.GetProjectByIdAsync(projectId);
            var previousStage = previousProject.CurrentStage;
            
            var project = await _lifecycleService.RestoreProjectAsync(projectId, userId);
            
            if (dto.ResetProgress)
            {
                project.OverallProgress = 0;
                project.CurrentStage = "raw_content";
            }
            
            var availableActions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            
            var result = new ProjectActionResultDto
            {
                ProjectId = projectId,
                CurrentStage = project.CurrentStage,
                PreviousStage = previousStage,
                OverallProgress = project.OverallProgress,
                AvailableActions = availableActions,
                Message = "Project restored successfully",
                Success = true,
                ActionData = new { resetProgress = dto.ResetProgress }
            };
            
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpGet("available-actions")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<string>>> GetAvailableActions(string projectId)
    {
        try
        {
            var actions = await _lifecycleService.GetAvailableActionsAsync(projectId);
            return Ok(actions);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    [HttpPost("update-metrics")]
    [ProducesResponseType(typeof(ProjectMetricsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectMetricsDto>> UpdateMetrics(string projectId)
    {
        try
        {
            await _lifecycleService.UpdateProjectMetricsAsync(projectId);
            var project = await _projectService.GetProjectByIdAsync(projectId);
            return Ok(_mapper.Map<ProjectMetricsDto>(project.Metrics));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    private string? GetUserId()
    {
        return User?.Identity?.Name ?? User?.FindFirst("sub")?.Value;
    }
}