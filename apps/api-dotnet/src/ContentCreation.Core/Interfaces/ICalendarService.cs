using ContentCreation.Core.DTOs.Calendar;

namespace ContentCreation.Core.Interfaces;

public interface ICalendarService
{
    Task<List<CalendarPostDto>> GetScheduledPostsAsync(CalendarFilterDto filter);
    Task<CalendarWeekViewDto> GetWeekViewAsync(DateTime? startDate = null, string? timeZone = null, CalendarFilterDto? filter = null);
    Task<CalendarMonthViewDto> GetMonthViewAsync(int? year = null, int? month = null, string? timeZone = null, CalendarFilterDto? filter = null);
    Task<CalendarDayViewDto> GetDayViewAsync(DateTime? date = null, string? timeZone = null, CalendarFilterDto? filter = null);
}