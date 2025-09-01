using ContentCreation.Api.Features.Posts.DTOs;

namespace ContentCreation.Api.Features.Posts.Interfaces;

public interface IPostService
{
    Task<(List<PostDto> items, int totalCount)> GetPostsAsync(PostFilterDto filter);
    Task<PostDto> GetPostByIdAsync(string id);
    Task<List<PostDto>> GetPostsByIdsAsync(List<string> ids);
    Task<PostDto> CreatePostAsync(string projectId, CreatePostDto dto);
    Task<PostDto> UpdatePostAsync(string id, UpdatePostDto dto);
    Task<List<PostDto>> BulkUpdatePostsAsync(BulkUpdatePostsDto dto);
    Task DeletePostAsync(string id);
    Task<PostDto> SchedulePostAsync(SchedulePostDto dto);
    Task<PostDto> PublishPostAsync(string id);
    Task<PostPerformanceDto> GetPostPerformanceAsync(string id);
}