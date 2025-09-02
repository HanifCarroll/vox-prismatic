using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ContentCreation.Core.DTOs.Calendar;
using ContentCreation.Core.Interfaces;

namespace ContentCreation.Api.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController : ControllerBase
{
    private readonly ICalendarService _calendarService;
    private readonly ILogger<CalendarController> _logger;

    public CalendarController(
        ICalendarService calendarService,
        ILogger<CalendarController> logger)
    {
        _calendarService = calendarService;
        _logger = logger;
    }

    /// <summary>
    /// Get scheduled/published posts for calendar view
    /// </summary>
    [HttpGet("posts")]
    [ProducesResponseType(typeof(List<CalendarPostDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCalendarPosts([FromQuery] CalendarFilterDto filter)
    {
        try
        {
            var posts = await _calendarService.GetScheduledPostsAsync(filter);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving calendar posts");
            return StatusCode(500, new { error = "Failed to retrieve calendar posts" });
        }
    }

    /// <summary>
    /// Get calendar week view
    /// </summary>
    [HttpGet("week")]
    [ProducesResponseType(typeof(CalendarWeekViewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWeekView(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] string? timeZone = null,
        [FromQuery] CalendarFilterDto? filter = null)
    {
        try
        {
            var weekView = await _calendarService.GetWeekViewAsync(startDate, timeZone, filter);
            return Ok(weekView);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving week view");
            return StatusCode(500, new { error = "Failed to retrieve week view" });
        }
    }

    /// <summary>
    /// Get calendar month view
    /// </summary>
    [HttpGet("month")]
    [ProducesResponseType(typeof(CalendarMonthViewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMonthView(
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] string? timeZone = null,
        [FromQuery] CalendarFilterDto? filter = null)
    {
        try
        {
            var monthView = await _calendarService.GetMonthViewAsync(year, month, timeZone, filter);
            return Ok(monthView);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving month view");
            return StatusCode(500, new { error = "Failed to retrieve month view" });
        }
    }

    /// <summary>
    /// Get calendar day view
    /// </summary>
    [HttpGet("day")]
    [ProducesResponseType(typeof(CalendarDayViewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDayView(
        [FromQuery] DateTime? date = null,
        [FromQuery] string? timeZone = null,
        [FromQuery] CalendarFilterDto? filter = null)
    {
        try
        {
            var dayView = await _calendarService.GetDayViewAsync(date, timeZone, filter);
            return Ok(dayView);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving day view");
            return StatusCode(500, new { error = "Failed to retrieve day view" });
        }
    }
}