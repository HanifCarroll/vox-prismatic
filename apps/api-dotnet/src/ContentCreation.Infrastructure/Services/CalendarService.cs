using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Calendar;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using System.Globalization;

namespace ContentCreation.Infrastructure.Services;

public class CalendarService : ICalendarService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CalendarService> _logger;

    public CalendarService(ApplicationDbContext context, ILogger<CalendarService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<CalendarPostDto>> GetScheduledPostsAsync(CalendarFilterDto filter)
    {
        try
        {
            var query = _context.ProjectScheduledPosts
                .Include(sp => sp.Post)
                .Include(sp => sp.Project)
                .AsQueryable();

            if (filter.StartDate.HasValue)
            {
                query = query.Where(sp => sp.ScheduledTime >= filter.StartDate.Value);
            }

            if (filter.EndDate.HasValue)
            {
                query = query.Where(sp => sp.ScheduledTime <= filter.EndDate.Value);
            }

            if (filter.Platforms?.Any() == true)
            {
                query = query.Where(sp => filter.Platforms.Contains(sp.Platform));
            }

            if (filter.ProjectIds?.Any() == true)
            {
                query = query.Where(sp => filter.ProjectIds.Contains(sp.ProjectId));
            }

            if (filter.Statuses?.Any() == true)
            {
                query = query.Where(sp => filter.Statuses.Contains(sp.Status));
            }

            var scheduledPosts = await query
                .OrderBy(sp => sp.ScheduledTime)
                .Select(sp => new CalendarPostDto
                {
                    Id = sp.Id,
                    PostId = sp.PostId,
                    ProjectId = sp.ProjectId,
                    ProjectTitle = sp.Project.Title,
                    PostTitle = sp.Post.Title,
                    Platform = sp.Platform,
                    Content = sp.Content,
                    ScheduledTime = sp.ScheduledTime,
                    Status = sp.Status,
                    ExternalPostId = sp.ExternalPostId
                })
                .ToListAsync();

            return scheduledPosts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scheduled posts");
            throw;
        }
    }

    public async Task<CalendarWeekViewDto> GetWeekViewAsync(DateTime? startDate = null, string? timeZone = null, CalendarFilterDto? filter = null)
    {
        try
        {
            var tz = timeZone ?? "UTC";
            var start = startDate ?? DateTime.UtcNow;
            
            // Calculate week start (Monday) and end (Sunday)
            var culture = CultureInfo.InvariantCulture;
            var diff = (7 + (start.DayOfWeek - DayOfWeek.Monday)) % 7;
            var weekStart = start.AddDays(-1 * diff).Date;
            var weekEnd = weekStart.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);

            var filterToUse = filter ?? new CalendarFilterDto();
            filterToUse.StartDate = weekStart;
            filterToUse.EndDate = weekEnd;

            var posts = await GetScheduledPostsAsync(filterToUse);

            var weekView = new CalendarWeekViewDto
            {
                WeekStart = weekStart,
                WeekEnd = weekEnd,
                TimeZone = tz,
                TotalPosts = posts.Count,
                DayPosts = new Dictionary<string, List<CalendarPostDto>>(),
                PlatformCounts = new Dictionary<string, int>()
            };

            // Initialize days of week
            for (int i = 0; i < 7; i++)
            {
                var day = weekStart.AddDays(i);
                weekView.DayPosts[day.ToString("yyyy-MM-dd")] = new List<CalendarPostDto>();
            }

            // Group posts by day
            foreach (var post in posts)
            {
                var dayKey = post.ScheduledTime.ToString("yyyy-MM-dd");
                if (weekView.DayPosts.ContainsKey(dayKey))
                {
                    weekView.DayPosts[dayKey].Add(post);
                }

                // Count platforms
                if (!weekView.PlatformCounts.ContainsKey(post.Platform))
                {
                    weekView.PlatformCounts[post.Platform] = 0;
                }
                weekView.PlatformCounts[post.Platform]++;
            }

            return weekView;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving week view");
            throw;
        }
    }

    public async Task<CalendarMonthViewDto> GetMonthViewAsync(int? year = null, int? month = null, string? timeZone = null, CalendarFilterDto? filter = null)
    {
        try
        {
            var tz = timeZone ?? "UTC";
            var now = DateTime.UtcNow;
            var targetYear = year ?? now.Year;
            var targetMonth = month ?? now.Month;

            var monthStart = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);

            var filterToUse = filter ?? new CalendarFilterDto();
            filterToUse.StartDate = monthStart;
            filterToUse.EndDate = monthEnd;

            var posts = await GetScheduledPostsAsync(filterToUse);

            var monthView = new CalendarMonthViewDto
            {
                Year = targetYear,
                Month = targetMonth,
                MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(targetMonth),
                TimeZone = tz,
                TotalPosts = posts.Count,
                DayPosts = new Dictionary<int, List<CalendarPostDto>>(),
                PlatformCounts = new Dictionary<string, int>(),
                StatusCounts = new Dictionary<string, int>()
            };

            // Initialize all days of the month
            var daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            for (int day = 1; day <= daysInMonth; day++)
            {
                monthView.DayPosts[day] = new List<CalendarPostDto>();
            }

            // Group posts by day and collect stats
            foreach (var post in posts)
            {
                var day = post.ScheduledTime.Day;
                monthView.DayPosts[day].Add(post);

                // Count platforms
                if (!monthView.PlatformCounts.ContainsKey(post.Platform))
                {
                    monthView.PlatformCounts[post.Platform] = 0;
                }
                monthView.PlatformCounts[post.Platform]++;

                // Count statuses
                if (!monthView.StatusCounts.ContainsKey(post.Status))
                {
                    monthView.StatusCounts[post.Status] = 0;
                }
                monthView.StatusCounts[post.Status]++;
            }

            return monthView;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving month view");
            throw;
        }
    }

    public async Task<CalendarDayViewDto> GetDayViewAsync(DateTime? date = null, string? timeZone = null, CalendarFilterDto? filter = null)
    {
        try
        {
            var tz = timeZone ?? "UTC";
            var targetDate = (date ?? DateTime.UtcNow).Date;
            var dayStart = targetDate;
            var dayEnd = targetDate.AddDays(1).AddSeconds(-1);

            var filterToUse = filter ?? new CalendarFilterDto();
            filterToUse.StartDate = dayStart;
            filterToUse.EndDate = dayEnd;

            var posts = await GetScheduledPostsAsync(filterToUse);

            var dayView = new CalendarDayViewDto
            {
                Date = targetDate,
                TimeZone = tz,
                Posts = posts.OrderBy(p => p.ScheduledTime).ToList(),
                TotalPosts = posts.Count,
                PlatformCounts = new Dictionary<string, int>(),
                HourlyDistribution = new Dictionary<string, int>()
            };

            // Initialize hourly distribution
            for (int hour = 0; hour < 24; hour++)
            {
                dayView.HourlyDistribution[$"{hour:00}:00"] = 0;
            }

            // Calculate stats
            foreach (var post in posts)
            {
                // Count platforms
                if (!dayView.PlatformCounts.ContainsKey(post.Platform))
                {
                    dayView.PlatformCounts[post.Platform] = 0;
                }
                dayView.PlatformCounts[post.Platform]++;

                // Hourly distribution
                var hourKey = $"{post.ScheduledTime.Hour:00}:00";
                if (dayView.HourlyDistribution.ContainsKey(hourKey))
                {
                    dayView.HourlyDistribution[hourKey]++;
                }
            }

            return dayView;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving day view");
            throw;
        }
    }
}