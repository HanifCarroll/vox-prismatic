using ContentCreation.Core.DTOs.Prompts;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PromptsController : ControllerBase
{
    private readonly IPromptService _promptService;
    private readonly ILogger<PromptsController> _logger;

    public PromptsController(
        IPromptService promptService,
        ILogger<PromptsController> logger)
    {
        _promptService = promptService;
        _logger = logger;
    }

    /// <summary>
    /// Get all prompt templates with filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<PromptTemplateDto>>> GetTemplates(
        [FromQuery] PromptCategory? category = null,
        [FromQuery] PromptStatus? status = null,
        [FromQuery] PromptModel? model = null,
        [FromQuery] bool? isDefault = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var filter = new PromptFilterDto
        {
            Category = category,
            Status = status,
            Model = model,
            IsDefault = isDefault,
            SearchTerm = search,
            Page = page,
            PageSize = pageSize
        };

        var templates = await _promptService.GetTemplatesAsync(filter);
        return Ok(templates);
    }

    /// <summary>
    /// Get a specific prompt template
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<PromptTemplateDto>> GetTemplate(Guid id)
    {
        var template = await _promptService.GetTemplateByIdAsync(id);
        
        if (template == null)
            return NotFound();
        
        return Ok(template);
    }

    /// <summary>
    /// Get default template for a category
    /// </summary>
    [HttpGet("default/{category}")]
    public async Task<ActionResult<PromptTemplateDto>> GetDefaultTemplate(PromptCategory category)
    {
        var template = await _promptService.GetDefaultTemplateAsync(category);
        
        if (template == null)
            return NotFound(new { error = $"No default template found for category {category}" });
        
        return Ok(template);
    }

    /// <summary>
    /// Create a new prompt template
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<PromptTemplateDto>> CreateTemplate([FromBody] CreatePromptTemplateDto dto)
    {
        try
        {
            var template = await _promptService.CreateTemplateAsync(dto);
            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create prompt template");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update a prompt template
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<PromptTemplateDto>> UpdateTemplate(Guid id, [FromBody] UpdatePromptTemplateDto dto)
    {
        try
        {
            var template = await _promptService.UpdateTemplateAsync(id, dto);
            
            if (template == null)
                return NotFound();
            
            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update prompt template {TemplateId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Delete a prompt template
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var success = await _promptService.DeleteTemplateAsync(id);
        
        if (!success)
            return NotFound();
        
        return Ok(new { message = "Template deleted successfully" });
    }

    /// <summary>
    /// Clone a prompt template
    /// </summary>
    [HttpPost("clone")]
    public async Task<ActionResult<PromptTemplateDto>> CloneTemplate([FromBody] ClonePromptTemplateDto dto)
    {
        try
        {
            var template = await _promptService.CloneTemplateAsync(dto);
            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clone prompt template");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Render a prompt with variables
    /// </summary>
    [HttpPost("render")]
    public async Task<ActionResult<RenderPromptResultDto>> RenderPrompt([FromBody] RenderPromptDto dto)
    {
        try
        {
            var result = await _promptService.RenderPromptAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to render prompt");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Render prompt using default template for category
    /// </summary>
    [HttpPost("render-default")]
    public async Task<ActionResult<RenderPromptResultDto>> RenderDefaultPrompt(
        [FromQuery] PromptCategory category,
        [FromBody] Dictionary<string, object> variables)
    {
        try
        {
            var result = await _promptService.RenderPromptWithDefaultsAsync(category, variables);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to render default prompt for category {Category}", category);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Test a prompt template
    /// </summary>
    [HttpPost("test")]
    public async Task<ActionResult<TestPromptResultDto>> TestPrompt([FromBody] TestPromptDto dto)
    {
        try
        {
            var result = await _promptService.TestPromptAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to test prompt");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Batch test a template with multiple variable sets
    /// </summary>
    [HttpPost("{id}/batch-test")]
    public async Task<ActionResult<List<TestPromptResultDto>>> BatchTest(
        Guid id,
        [FromBody] List<Dictionary<string, object>> testCases)
    {
        try
        {
            var results = await _promptService.BatchTestAsync(id, testCases);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to batch test prompt template {TemplateId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Validate variables for a template
    /// </summary>
    [HttpPost("{id}/validate")]
    public async Task<ActionResult> ValidateVariables(Guid id, [FromBody] Dictionary<string, object> variables)
    {
        var isValid = await _promptService.ValidateVariablesAsync(id, variables);
        
        if (isValid)
            return Ok(new { valid = true });
        
        return BadRequest(new { valid = false, error = "Variable validation failed" });
    }

    /// <summary>
    /// Get template usage history
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<List<PromptHistoryDto>>> GetHistory(
        [FromQuery] Guid? templateId = null,
        [FromQuery] string? userId = null,
        [FromQuery] int days = 30)
    {
        var history = await _promptService.GetHistoryAsync(templateId, userId, days);
        return Ok(history);
    }

    /// <summary>
    /// Get template statistics
    /// </summary>
    [HttpGet("{id}/stats")]
    public async Task<ActionResult<PromptStatsDto>> GetTemplateStats(Guid id)
    {
        try
        {
            var stats = await _promptService.GetTemplateStatsAsync(id);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get stats for template {TemplateId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get statistics by category
    /// </summary>
    [HttpGet("stats/by-category")]
    public async Task<ActionResult<Dictionary<PromptCategory, PromptStatsDto>>> GetCategoryStats()
    {
        var stats = await _promptService.GetCategoryStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Initialize default templates
    /// </summary>
    [HttpPost("initialize-defaults")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> InitializeDefaults()
    {
        await _promptService.InitializeDefaultTemplatesAsync();
        return Ok(new { message = "Default templates initialized" });
    }

    /// <summary>
    /// Reset templates to defaults
    /// </summary>
    [HttpPost("reset-to-defaults")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetToDefaults([FromQuery] PromptCategory? category = null)
    {
        var success = await _promptService.ResetToDefaultsAsync(category);
        
        if (success)
            return Ok(new { message = "Templates reset to defaults" });
        
        return BadRequest(new { error = "Failed to reset templates" });
    }

    /// <summary>
    /// Import templates from JSON
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<PromptTemplateDto>>> ImportTemplates([FromBody] string jsonContent)
    {
        try
        {
            var templates = await _promptService.ImportTemplatesAsync(jsonContent);
            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import templates");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Export templates to JSON
    /// </summary>
    [HttpGet("export")]
    public async Task<ActionResult> ExportTemplates([FromQuery] PromptCategory? category = null)
    {
        var json = await _promptService.ExportTemplatesAsync(category);
        return Ok(new { content = json });
    }

    /// <summary>
    /// Archive unused templates
    /// </summary>
    [HttpPost("archive-unused")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ArchiveUnused([FromQuery] int unusedDays = 90)
    {
        var count = await _promptService.ArchiveUnusedTemplatesAsync(unusedDays);
        return Ok(new { message = $"Archived {count} unused templates" });
    }

    /// <summary>
    /// Get template versions
    /// </summary>
    [HttpGet("{id}/versions")]
    public async Task<ActionResult<List<PromptTemplateDto>>> GetTemplateVersions(Guid id)
    {
        var versions = await _promptService.GetTemplateVersionsAsync(id);
        return Ok(versions);
    }

    /// <summary>
    /// Create new version of template
    /// </summary>
    [HttpPost("{id}/new-version")]
    public async Task<ActionResult<PromptTemplateDto>> CreateNewVersion(Guid id, [FromBody] string updatedTemplate)
    {
        try
        {
            var template = await _promptService.CreateNewVersionAsync(id, updatedTemplate);
            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create new version for template {TemplateId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }
}