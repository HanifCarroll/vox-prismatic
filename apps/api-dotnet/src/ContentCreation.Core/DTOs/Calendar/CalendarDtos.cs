using System.ComponentModel.DataAnnotations;

namespace ContentCreation.Core.DTOs.Calendar;

public class CalendarPostDto
{
    public string Id { get; set; } = string.Empty;
    public string PostId { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectTitle { get; set; } = string.Empty;
    public string PostTitle { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ExternalPostId { get; set; }
    public bool IsPublished => Status == "published";
}

public class CalendarFilterDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public List<string>? Platforms { get; set; }
    public List<string>? ProjectIds { get; set; }
    public List<string>? Statuses { get; set; }
    public string? TimeZone { get; set; } = "UTC";
}

public class CalendarWeekViewDto
{
    public DateTime WeekStart { get; set; }
    public DateTime WeekEnd { get; set; }
    public string TimeZone { get; set; } = "UTC";
    public Dictionary<string, List<CalendarPostDto>> DayPosts { get; set; } = new();
    public int TotalPosts { get; set; }
    public Dictionary<string, int> PlatformCounts { get; set; } = new();
}

public class CalendarMonthViewDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public string TimeZone { get; set; } = "UTC";
    public Dictionary<int, List<CalendarPostDto>> DayPosts { get; set; } = new();
    public int TotalPosts { get; set; }
    public Dictionary<string, int> PlatformCounts { get; set; } = new();
    public Dictionary<string, int> StatusCounts { get; set; } = new();
}

public class CalendarDayViewDto
{
    public DateTime Date { get; set; }
    public string TimeZone { get; set; } = "UTC";
    public List<CalendarPostDto> Posts { get; set; } = new();
    public int TotalPosts { get; set; }
    public Dictionary<string, int> PlatformCounts { get; set; } = new();
    public Dictionary<string, int> HourlyDistribution { get; set; } = new();
}