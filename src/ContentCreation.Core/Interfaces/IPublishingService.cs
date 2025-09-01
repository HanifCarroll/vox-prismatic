using ContentCreation.Core.DTOs.Publishing;

namespace ContentCreation.Core.Interfaces;

public interface IPostPublishingService
{
    // OAuth & Authentication
    Task<string> GetAuthorizationUrlAsync(string platform, string? state = null);
    Task<PlatformTokenDto> ExchangeAuthCodeAsync(PlatformAuthDto authDto);
    Task<bool> RefreshTokensAsync(string platform);
    Task<bool> RevokeAccessAsync(string platform);
    Task<PlatformProfileDto?> GetProfileAsync(string platform);
    Task<List<PlatformProfileDto>> GetConnectedProfilesAsync();
    Task<bool> TestConnectionAsync(string platform);
    
    // Direct Publishing
    Task<PublishResultDto> PublishNowAsync(PublishNowDto dto);
    Task<PublishResultDto> PublishToLinkedInAsync(Guid postId);
    Task<PublishResultDto> PublishToTwitterAsync(Guid postId);
    Task<PublishResultDto> PublishToPlatformAsync(Guid postId, string platform);
    
    // Scheduled Publishing
    Task<ScheduledPostDto> SchedulePostAsync(SchedulePostDto dto);
    Task<List<ScheduledPostDto>> BulkScheduleAsync(BulkScheduleDto dto);
    Task<List<ScheduledPostDto>> GetScheduledPostsAsync(DateTime? from = null, DateTime? to = null);
    Task<ScheduledPostDto?> GetScheduledPostAsync(Guid scheduledPostId);
    Task<bool> UpdateScheduledPostAsync(UpdateScheduledPostDto dto);
    Task<bool> CancelScheduledPostAsync(CancelScheduledPostDto dto);
    Task<int> CancelAllScheduledPostsAsync(Guid? projectId = null);
    
    // Optimal Timing
    Task<OptimalTimeDto> GetOptimalTimeAsync(string platform, DateTime? preferredDate = null);
    Task<List<OptimalTimeDto>> GetOptimalTimesAsync(List<string> platforms, DateTime? preferredDate = null);
    
    // Queue Management
    Task<PublishingQueueDto> GetQueueStatusAsync();
    Task ProcessScheduledPostsAsync(); // Called by Hangfire
    Task<int> RetryFailedPostsAsync(RetryFailedPostsDto dto);
    Task CleanupOldScheduledPostsAsync(int daysOld = 30);
    
    // Statistics
    Task<PublishingStatsDto> GetPublishingStatsAsync(DateTime? from = null, DateTime? to = null);
    Task<Dictionary<string, PublishingStatsDto>> GetStatsByPlatformAsync(DateTime? from = null, DateTime? to = null);
    
    // Platform-specific features
    Task<string?> UploadMediaAsync(string platform, byte[] mediaData, string contentType);
    Task<bool> DeletePostAsync(string platform, string postId);
    Task<Dictionary<string, object>?> GetPostAnalyticsAsync(string platform, string postId);
}