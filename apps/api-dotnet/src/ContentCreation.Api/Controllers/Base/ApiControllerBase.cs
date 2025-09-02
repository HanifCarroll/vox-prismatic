using Microsoft.AspNetCore.Mvc;

namespace ContentCreation.Api.Controllers.Base;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected readonly ILogger<ApiControllerBase> _baseLogger;

    protected ApiControllerBase(ILogger<ApiControllerBase> logger)
    {
        _baseLogger = logger;
    }

    protected async Task<IActionResult> ExecuteAsync<T>(
        Func<Task<T>> action,
        string errorMessage = "An error occurred")
    {
        try
        {
            var result = await action();
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _baseLogger.LogError(ex, errorMessage);
            return StatusCode(500, new { error = errorMessage });
        }
    }

    protected async Task<IActionResult> ExecuteWithCreatedAsync<T>(
        Func<Task<T>> action,
        Func<T, object> routeValues,
        string actionName,
        string errorMessage = "Failed to create resource")
    {
        try
        {
            var result = await action();
            return CreatedAtAction(actionName, routeValues(result), result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _baseLogger.LogError(ex, errorMessage);
            return StatusCode(500, new { error = errorMessage });
        }
    }

    protected async Task<IActionResult> ExecuteNoContentAsync(
        Func<Task> action,
        string errorMessage = "Operation failed")
    {
        try
        {
            await action();
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _baseLogger.LogError(ex, errorMessage);
            return StatusCode(500, new { error = errorMessage });
        }
    }

    protected string GetCurrentUserId()
    {
        return User.Identity?.Name ?? "system";
    }
}