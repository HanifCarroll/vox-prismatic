using ContentCreation.Api.Features.Common.DTOs.Posts;

namespace ContentCreation.Api.Features.Common.Interfaces;

public interface IPostService
{
    Task<PostDto> CreateAsync(CreatePostDto dto);
    Task<List<PostDto>> GetAllAsync(PostFilterDto? filter = null);
    Task<PostDto> GetByIdAsync(string id, bool includeSchedule = false);
    Task<List<PostDto>> GetByInsightIdAsync(string insightId);
    Task<List<PostDto>> GetByProjectIdAsync(string projectId);
    Task<PostDto> UpdateAsync(string id, UpdatePostDto dto);
    Task DeleteAsync(string id);
    Task<Dictionary<string, int>> GetStatusCountsAsync();
    Task<Dictionary<string, int>> GetPlatformCountsAsync();
    Task<BulkOperationResponseDto> BulkOperationAsync(BulkPostOperationDto dto);
}

public interface IPostStateService
{
    Task<PostDto> SubmitForReviewAsync(string id);
    Task<PostDto> ApprovePostAsync(string id, string approvedBy);
    Task<PostDto> RejectPostAsync(string id, string rejectedBy, string reason);
    Task<PostDto> ArchivePostAsync(string id, string reason);
    Task<PostDto> SchedulePostAsync(string id, DateTime scheduledTime, string? timeZone = null);
    Task<PostDto> ScheduleAsync(string id, DateTime scheduledTime, string? timeZone = null);
    Task<PostDto> UnschedulePostAsync(string id);
    Task<PostDto> PublishAsync(string id);
    Task<PostDto> MarkFailedAsync(string id, string error);
    Task<AvailableActionsDto> GetAvailableActionsAsync(string id);
    Task<bool> CanTransitionAsync(string id, PostAction action);
}