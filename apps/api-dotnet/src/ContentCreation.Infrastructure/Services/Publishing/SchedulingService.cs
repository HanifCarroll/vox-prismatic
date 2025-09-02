using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Globalization;

namespace ContentCreation.Infrastructure.Services.Publishing;

public class SchedulingService : ISchedulingService
{
    private readonly ILogger<SchedulingService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly TimeZoneInfo _defaultTimeZone;

    public SchedulingService(
        ILogger<SchedulingService> logger,
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _configuration = configuration;
        
        var timeZoneId = configuration["Scheduling:DefaultTimeZone"] ?? "UTC";
        _defaultTimeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }

    public async Task<DateTime> CalculateOptimalPostingTime(string platform, string? projectId = null)
    {
        _logger.LogInformation("Calculating optimal posting time for {Platform}", platform);
        
        var historicalData = await GetHistoricalEngagementData(platform, projectId);
        var platformDefaults = GetPlatformDefaultTimes(platform);
        var existingSchedule = await GetExistingSchedule();
        
        var optimalTime = await DetermineOptimalTime(
            platform, 
            historicalData, 
            platformDefaults, 
            existingSchedule);
        
        return optimalTime;
    }

    public async Task<List<DateTime>> GetOptimalPostingSchedule(
        string projectId, 
        int numberOfPosts, 
        List<string> platforms,
        DateTime startDate,
        DateTime endDate)
    {
        _logger.LogInformation("Generating optimal schedule for {Count} posts across {Platforms}", 
            numberOfPosts, string.Join(", ", platforms));
        
        var schedule = new List<DateTime>();
        var daysInRange = (int)(endDate - startDate).TotalDays;
        var postsPerDay = Math.Max(1, numberOfPosts / daysInRange);
        var minHoursBetweenPosts = GetMinimumHoursBetweenPosts(platforms);
        
        var currentDate = startDate;
        var postsScheduled = 0;
        
        while (postsScheduled < numberOfPosts && currentDate <= endDate)
        {
            var dailySlots = await GetDailyOptimalSlots(platforms, currentDate);
            
            foreach (var slot in dailySlots.Take(postsPerDay))
            {
                if (postsScheduled >= numberOfPosts) break;
                
                if (await IsSlotAvailable(slot, minHoursBetweenPosts))
                {
                    schedule.Add(slot);
                    postsScheduled++;
                }
            }
            
            currentDate = currentDate.AddDays(1);
        }
        
        return schedule;
    }

    public async Task<bool> ValidateScheduleConflicts(DateTime proposedTime, string platform)
    {
        var minBuffer = GetPlatformMinimumBuffer(platform);
        var rangeStart = proposedTime.AddMinutes(-minBuffer);
        var rangeEnd = proposedTime.AddMinutes(minBuffer);
        
        var hasConflict = await _context.ProjectScheduledPosts
            .Where(sp => sp.Platform == platform)
            .Where(sp => sp.Status == "pending" || sp.Status == "scheduled")
            .Where(sp => sp.ScheduledTime >= rangeStart && sp.ScheduledTime <= rangeEnd)
            .AnyAsync();
        
        return !hasConflict;
    }

    public async Task<Dictionary<string, List<TimeSlot>>> GetAvailableTimeSlots(
        DateTime date,
        List<string> platforms)
    {
        var availableSlots = new Dictionary<string, List<TimeSlot>>();
        
        foreach (var platform in platforms)
        {
            var platformSlots = new List<TimeSlot>();
            var optimalHours = GetPlatformOptimalHours(platform);
            
            foreach (var hour in optimalHours)
            {
                var slotTime = new DateTime(date.Year, date.Month, date.Day, hour, 0, 0, DateTimeKind.Utc);
                
                if (await ValidateScheduleConflicts(slotTime, platform))
                {
                    var engagement = await PredictEngagementScore(platform, slotTime);
                    
                    platformSlots.Add(new TimeSlot
                    {
                        Time = slotTime,
                        Platform = platform,
                        EngagementScore = engagement,
                        IsAvailable = true
                    });
                }
            }
            
            availableSlots[platform] = platformSlots.OrderByDescending(s => s.EngagementScore).ToList();
        }
        
        return availableSlots;
    }

    public async Task<ScheduleAnalytics> AnalyzeSchedulePerformance(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        
        if (project == null)
        {
            throw new ArgumentException($"Project {projectId} not found");
        }
        
        var publishedPosts = project.ScheduledPosts
            .Where(sp => sp.Status == "published")
            .ToList();
        
        var analytics = new ScheduleAnalytics
        {
            ProjectId = projectId,
            TotalScheduledPosts = project.ScheduledPosts.Count,
            PublishedPosts = publishedPosts.Count,
            PendingPosts = project.ScheduledPosts.Count(sp => sp.Status == "pending"),
            FailedPosts = project.ScheduledPosts.Count(sp => sp.Status == "failed")
        };
        
        if (publishedPosts.Any())
        {
            analytics.AverageEngagementByHour = publishedPosts
                .GroupBy(p => p.PublishedAt?.Hour ?? p.ScheduledTime.Hour)
                .ToDictionary(
                    g => g.Key,
                    g => CalculateAverageEngagement(g.ToList())
                );
            
            analytics.BestPerformingTimes = publishedPosts
                .OrderByDescending(p => GetEngagementMetric(p))
                .Take(5)
                .Select(p => new TimePerformance
                {
                    Time = p.PublishedAt ?? p.ScheduledTime,
                    Platform = p.Platform,
                    EngagementScore = GetEngagementMetric(p)
                })
                .ToList();
            
            analytics.PlatformDistribution = publishedPosts
                .GroupBy(p => p.Platform)
                .ToDictionary(
                    g => g.Key,
                    g => g.Count()
                );
        }
        
        analytics.OptimalScheduleSuggestions = await GenerateScheduleSuggestions(project);
        
        return analytics;
    }

    private async Task<List<EngagementData>> GetHistoricalEngagementData(string platform, string? projectId)
    {
        var query = _context.ProjectScheduledPosts
            .Include(sp => sp.Post)
            .Where(sp => sp.Platform == platform)
            .Where(sp => sp.Status == "published");
        
        if (!string.IsNullOrEmpty(projectId))
        {
            query = query.Where(sp => sp.ProjectId == projectId);
        }
        
        var historicalPosts = await query
            .OrderByDescending(sp => sp.PublishedAt)
            .Take(100)
            .ToListAsync();
        
        return historicalPosts.Select(sp => new EngagementData
        {
            PostId = sp.PostId,
            Platform = sp.Platform,
            PublishedAt = sp.PublishedAt ?? sp.ScheduledTime,
            Hour = (sp.PublishedAt ?? sp.ScheduledTime).Hour,
            DayOfWeek = (sp.PublishedAt ?? sp.ScheduledTime).DayOfWeek,
            EngagementScore = GetEngagementMetric(sp)
        }).ToList();
    }

    private PlatformScheduleDefaults GetPlatformDefaultTimes(string platform)
    {
        return platform.ToLower() switch
        {
            "linkedin" => new PlatformScheduleDefaults
            {
                Platform = "linkedin",
                OptimalHours = new[] { 7, 8, 10, 12, 17, 18 },
                OptimalDays = new[] { DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday },
                MinimumHoursBetweenPosts = 4
            },
            _ => new PlatformScheduleDefaults
            {
                Platform = platform,
                OptimalHours = new[] { 9, 12, 17, 19 },
                OptimalDays = Enum.GetValues<DayOfWeek>(),
                MinimumHoursBetweenPosts = 3
            }
        };
    }

    private async Task<List<ProjectScheduledPost>> GetExistingSchedule()
    {
        return await _context.ProjectScheduledPosts
            .Where(sp => sp.Status == "pending" || sp.Status == "scheduled")
            .Where(sp => sp.ScheduledTime >= DateTime.UtcNow)
            .OrderBy(sp => sp.ScheduledTime)
            .ToListAsync();
    }

    private async Task<DateTime> DetermineOptimalTime(
        string platform,
        List<EngagementData> historicalData,
        PlatformScheduleDefaults defaults,
        List<ProjectScheduledPost> existingSchedule)
    {
        var baseTime = DateTime.UtcNow.AddHours(24);
        
        if (historicalData.Any())
        {
            var bestHours = historicalData
                .GroupBy(d => d.Hour)
                .OrderByDescending(g => g.Average(d => d.EngagementScore))
                .Take(3)
                .Select(g => g.Key)
                .ToList();
            
            var bestDays = historicalData
                .GroupBy(d => d.DayOfWeek)
                .OrderByDescending(g => g.Average(d => d.EngagementScore))
                .Take(3)
                .Select(g => g.Key)
                .ToList();
            
            for (int dayOffset = 0; dayOffset < 7; dayOffset++)
            {
                var targetDate = baseTime.AddDays(dayOffset);
                
                if (bestDays.Contains(targetDate.DayOfWeek))
                {
                    foreach (var hour in bestHours)
                    {
                        var candidateTime = new DateTime(
                            targetDate.Year, targetDate.Month, targetDate.Day,
                            hour, 0, 0, DateTimeKind.Utc);
                        
                        if (await IsSlotAvailable(candidateTime, defaults.MinimumHoursBetweenPosts))
                        {
                            return candidateTime;
                        }
                    }
                }
            }
        }
        
        foreach (var hour in defaults.OptimalHours)
        {
            var candidateTime = new DateTime(
                baseTime.Year, baseTime.Month, baseTime.Day,
                hour, 0, 0, DateTimeKind.Utc);
            
            if (candidateTime > DateTime.UtcNow && 
                await IsSlotAvailable(candidateTime, defaults.MinimumHoursBetweenPosts))
            {
                return candidateTime;
            }
        }
        
        return baseTime.AddHours(defaults.OptimalHours.FirstOrDefault());
    }

    private async Task<bool> IsSlotAvailable(DateTime slotTime, int minHoursBetweenPosts)
    {
        var rangeStart = slotTime.AddHours(-minHoursBetweenPosts);
        var rangeEnd = slotTime.AddHours(minHoursBetweenPosts);
        
        var hasConflict = await _context.ProjectScheduledPosts
            .Where(sp => sp.Status == "pending" || sp.Status == "scheduled")
            .Where(sp => sp.ScheduledTime >= rangeStart && sp.ScheduledTime <= rangeEnd)
            .AnyAsync();
        
        return !hasConflict;
    }

    private Task<List<DateTime>> GetDailyOptimalSlots(List<string> platforms, DateTime date)
    {
        var slots = new List<DateTime>();
        
        foreach (var platform in platforms)
        {
            var platformHours = GetPlatformOptimalHours(platform);
            
            foreach (var hour in platformHours)
            {
                var slotTime = new DateTime(date.Year, date.Month, date.Day, hour, 0, 0, DateTimeKind.Utc);
                
                if (slotTime > DateTime.UtcNow)
                {
                    slots.Add(slotTime);
                }
            }
        }
        
        return Task.FromResult(slots.OrderBy(s => s).ToList());
    }

    private int[] GetPlatformOptimalHours(string platform)
    {
        return platform.ToLower() switch
        {
            "linkedin" => new[] { 7, 8, 10, 12, 17, 18 },
            _ => new[] { 9, 12, 17, 19 }
        };
    }

    private int GetMinimumHoursBetweenPosts(List<string> platforms)
    {
        if (platforms.Contains("linkedin", StringComparer.OrdinalIgnoreCase))
            return 4;
        return 3;
    }

    private int GetPlatformMinimumBuffer(string platform)
    {
        return platform.ToLower() switch
        {
            "linkedin" => 240,
            _ => 180
        };
    }

    private async Task<double> PredictEngagementScore(string platform, DateTime time)
    {
        var historicalData = await GetHistoricalEngagementData(platform, null);
        
        if (!historicalData.Any())
        {
            return GetDefaultEngagementScore(platform, time);
        }
        
        var hourData = historicalData.Where(d => d.Hour == time.Hour);
        var dayData = historicalData.Where(d => d.DayOfWeek == time.DayOfWeek);
        
        var hourScore = hourData.Any() ? hourData.Average(d => d.EngagementScore) : 0.5;
        var dayScore = dayData.Any() ? dayData.Average(d => d.EngagementScore) : 0.5;
        
        return (hourScore * 0.6 + dayScore * 0.4);
    }

    private double GetDefaultEngagementScore(string platform, DateTime time)
    {
        var defaults = GetPlatformDefaultTimes(platform);
        
        var hourScore = defaults.OptimalHours.Contains(time.Hour) ? 0.8 : 0.4;
        var dayScore = defaults.OptimalDays.Contains(time.DayOfWeek) ? 0.8 : 0.5;
        
        return (hourScore + dayScore) / 2;
    }

    private double GetEngagementMetric(ProjectScheduledPost post)
    {
        if (post.Post?.Metadata != null)
        {
            try
            {
                var metadata = post.Post.Metadata;
                if (metadata.TryGetValue("engagement", out var engagement))
                {
                    return Convert.ToDouble(engagement);
                }
            }
            catch { }
        }
        
        return 0.5;
    }

    private double CalculateAverageEngagement(List<ProjectScheduledPost> posts)
    {
        if (!posts.Any()) return 0;
        return posts.Average(p => GetEngagementMetric(p));
    }

    private Task<List<string>> GenerateScheduleSuggestions(ContentProject project)
    {
        var suggestions = new List<string>();
        
        var publishedPosts = project.ScheduledPosts
            .Where(sp => sp.Status == "published")
            .ToList();
        
        if (publishedPosts.Any())
        {
            var bestHour = publishedPosts
                .GroupBy(p => p.PublishedAt?.Hour ?? p.ScheduledTime.Hour)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault()?.Key;
            
            if (bestHour.HasValue)
            {
                suggestions.Add($"Your posts perform best at {bestHour:00}:00 UTC");
            }
            
            var bestDay = publishedPosts
                .GroupBy(p => (p.PublishedAt ?? p.ScheduledTime).DayOfWeek)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault()?.Key;
            
            if (bestDay.HasValue)
            {
                suggestions.Add($"Schedule more posts on {bestDay}s for better engagement");
            }
        }
        
        var pendingCount = project.ScheduledPosts.Count(sp => sp.Status == "pending");
        if (pendingCount > 10)
        {
            suggestions.Add($"You have {pendingCount} posts pending. Consider spreading them over more days.");
        }
        
        return Task.FromResult(suggestions);
    }
}

public interface ISchedulingService
{
    Task<DateTime> CalculateOptimalPostingTime(string platform, string? projectId = null);
    Task<List<DateTime>> GetOptimalPostingSchedule(string projectId, int numberOfPosts, List<string> platforms, DateTime startDate, DateTime endDate);
    Task<bool> ValidateScheduleConflicts(DateTime proposedTime, string platform);
    Task<Dictionary<string, List<TimeSlot>>> GetAvailableTimeSlots(DateTime date, List<string> platforms);
    Task<ScheduleAnalytics> AnalyzeSchedulePerformance(string projectId);
}

public class TimeSlot
{
    public DateTime Time { get; set; }
    public string Platform { get; set; } = string.Empty;
    public double EngagementScore { get; set; }
    public bool IsAvailable { get; set; }
}

public class ScheduleAnalytics
{
    public string ProjectId { get; set; } = string.Empty;
    public int TotalScheduledPosts { get; set; }
    public int PublishedPosts { get; set; }
    public int PendingPosts { get; set; }
    public int FailedPosts { get; set; }
    public Dictionary<int, double> AverageEngagementByHour { get; set; } = new();
    public List<TimePerformance> BestPerformingTimes { get; set; } = new();
    public Dictionary<string, int> PlatformDistribution { get; set; } = new();
    public List<string> OptimalScheduleSuggestions { get; set; } = new();
}

public class TimePerformance
{
    public DateTime Time { get; set; }
    public string Platform { get; set; } = string.Empty;
    public double EngagementScore { get; set; }
}

public class EngagementData
{
    public string PostId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public int Hour { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public double EngagementScore { get; set; }
}

public class PlatformScheduleDefaults
{
    public string Platform { get; set; } = string.Empty;
    public int[] OptimalHours { get; set; } = Array.Empty<int>();
    public DayOfWeek[] OptimalDays { get; set; } = Array.Empty<DayOfWeek>();
    public int MinimumHoursBetweenPosts { get; set; }
}