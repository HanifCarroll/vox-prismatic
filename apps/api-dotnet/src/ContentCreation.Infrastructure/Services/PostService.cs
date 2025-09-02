using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using AutoMapper;

namespace ContentCreation.Infrastructure.Services;

public class PostService : IPostService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPostStateService _stateService;
    private readonly ILogger<PostService> _logger;

    public PostService(
        ApplicationDbContext context,
        IMapper mapper,
        IPostStateService stateService,
        ILogger<PostService> logger)
    {
        _context = context;
        _mapper = mapper;
        _stateService = stateService;
        _logger = logger;
    }

    public async Task<PostDto> CreateAsync(CreatePostDto dto)
    {
        _logger.LogInformation("Creating post: {Title}", dto.Title);

        var insight = await _context.Insights
            .Include(i => i.ContentProject)
            .FirstOrDefaultAsync(i => i.Id == dto.InsightId);

        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {dto.InsightId} not found");
        }

        var post = new Post
        {
            Id = GenerateId("post"),
            ProjectId = insight.ProjectId,
            InsightId = dto.InsightId,
            Title = dto.Title,
            Content = dto.Content,
            Platform = dto.Platform.ToString(),
            Status = "draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created post: {PostId}", post.Id);
        return _mapper.Map<PostDto>(post);
    }

    public async Task<List<PostDto>> GetAllAsync(PostFilterDto? filter = null)
    {
        _logger.LogInformation("Getting all posts");

        var query = _context.Posts
            .Include(p => p.ContentProject)
            .Include(p => p.Insight)
            .AsQueryable();

        if (filter != null)
        {
            query = ApplyFilter(query, filter);
        }

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<PostDto>>(posts);
    }

    public async Task<PostDto> GetByIdAsync(string id, bool includeSchedule = false)
    {
        _logger.LogInformation("Finding post: {PostId}", id);

        var query = _context.Posts
            .Include(p => p.ContentProject)
            .Include(p => p.Insight)
            .AsQueryable();

        if (includeSchedule)
        {
            query = query.Include(p => p.ScheduledPosts);
        }

        var post = await query.FirstOrDefaultAsync(p => p.Id == id);

        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        var dto = _mapper.Map<PostDto>(post);
        
        if (includeSchedule && post.ScheduledPosts != null)
        {
            dto.ScheduledPosts = _mapper.Map<List<ScheduledPostDto>>(post.ScheduledPosts);
        }

        return dto;
    }

    public async Task<List<PostDto>> GetByInsightIdAsync(string insightId)
    {
        _logger.LogInformation("Finding posts for insight: {InsightId}", insightId);

        var posts = await _context.Posts
            .Where(p => p.InsightId == insightId)
            .Include(p => p.ContentProject)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<PostDto>>(posts);
    }

    public async Task<List<PostDto>> GetByProjectIdAsync(string projectId)
    {
        _logger.LogInformation("Finding posts for project: {ProjectId}", projectId);

        var posts = await _context.Posts
            .Where(p => p.ProjectId == projectId)
            .Include(p => p.Insight)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<PostDto>>(posts);
    }

    public async Task<PostDto> UpdateAsync(string id, UpdatePostDto dto)
    {
        _logger.LogInformation("Updating post: {PostId}", id);

        var post = await _context.Posts.FindAsync(id);
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!string.IsNullOrEmpty(dto.Title))
            post.Title = dto.Title;
        if (!string.IsNullOrEmpty(dto.Content))
            post.Content = dto.Content;
        if (dto.Platform.HasValue)
            post.Platform = dto.Platform.Value.ToString();
        
        if (!string.IsNullOrEmpty(dto.ErrorMessage))
            post.ErrorMessage = dto.ErrorMessage;
        if (dto.RejectedAt.HasValue)
            post.RejectedAt = dto.RejectedAt.Value;
        if (!string.IsNullOrEmpty(dto.RejectedBy))
            post.RejectedBy = dto.RejectedBy;
        if (!string.IsNullOrEmpty(dto.RejectedReason))
            post.RejectedReason = dto.RejectedReason;
        if (dto.ApprovedAt.HasValue)
            post.ApprovedAt = dto.ApprovedAt.Value;
        if (!string.IsNullOrEmpty(dto.ApprovedBy))
            post.ApprovedBy = dto.ApprovedBy;
        if (dto.ArchivedAt.HasValue)
            post.ArchivedAt = dto.ArchivedAt.Value;
        if (!string.IsNullOrEmpty(dto.ArchivedReason))
            post.ArchivedReason = dto.ArchivedReason;
        if (dto.FailedAt.HasValue)
            post.FailedAt = dto.FailedAt.Value;

        post.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated post: {PostId}", id);
        return _mapper.Map<PostDto>(post);
    }

    public async Task DeleteAsync(string id)
    {
        _logger.LogInformation("Removing post: {PostId}", id);

        var post = await _context.Posts
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (post.Status == "published")
        {
            throw new InvalidOperationException("Cannot delete published posts");
        }

        // Use transaction to ensure atomic delete
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Delete related scheduled posts first
            if (post.ScheduledPosts?.Any() == true)
            {
                _context.ProjectScheduledPosts.RemoveRange(post.ScheduledPosts);
            }

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Removed post: {PostId}", id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to remove post {PostId}", id);
            throw;
        }
    }

    public async Task<Dictionary<string, int>> GetStatusCountsAsync()
    {
        _logger.LogInformation("Getting post status counts");

        var counts = await _context.Posts
            .GroupBy(p => p.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count);

        var allStatuses = new[] { "draft", "needs_review", "approved", "scheduled", "published", "failed", "archived" };
        foreach (var status in allStatuses)
        {
            if (!counts.ContainsKey(status))
            {
                counts[status] = 0;
            }
        }

        return counts;
    }

    public async Task<Dictionary<string, int>> GetPlatformCountsAsync()
    {
        _logger.LogInformation("Getting post platform counts");

        var counts = await _context.Posts
            .GroupBy(p => p.Platform)
            .Select(g => new { Platform = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Platform, x => x.Count);

        return counts;
    }

    public async Task<BulkOperationResponseDto> BulkOperationAsync(BulkPostOperationDto dto)
    {
        if (!dto.PostIds.Any())
        {
            throw new ArgumentException("No post IDs provided");
        }

        _logger.LogInformation("Performing bulk operation {Action} on {Count} posts", 
            dto.Action, dto.PostIds.Count);

        var failedIds = new List<string>();
        var successCount = 0;

        foreach (var postId in dto.PostIds)
        {
            try
            {
                switch (dto.Action)
                {
                    case BulkPostAction.Approve:
                        await _stateService.ApprovePostAsync(postId, dto.ReviewedBy ?? "system");
                        break;
                    case BulkPostAction.Reject:
                        await _stateService.RejectPostAsync(postId, dto.ReviewedBy ?? "system", 
                            dto.Reason ?? "Bulk rejection");
                        break;
                    case BulkPostAction.Archive:
                        await _stateService.ArchivePostAsync(postId, dto.Reason ?? "Bulk archive");
                        break;
                    case BulkPostAction.SubmitForReview:
                        await _stateService.SubmitForReviewAsync(postId);
                        break;
                    case BulkPostAction.Schedule:
                        // For bulk scheduling, would need a scheduled time per post
                        throw new NotImplementedException("Bulk scheduling requires individual times");
                    case BulkPostAction.Unschedule:
                        await _stateService.UnschedulePostAsync(postId);
                        break;
                    default:
                        throw new ArgumentException($"Invalid action: {dto.Action}");
                }
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to {Action} post {PostId}", dto.Action, postId);
                failedIds.Add(postId);
            }
        }

        var message = $"Successfully {dto.Action.ToString().ToLower()}d {successCount} posts";
        if (failedIds.Any())
        {
            message += $", {failedIds.Count} failed";
        }

        _logger.LogInformation("Bulk operation completed: {Message}", message);

        return new BulkOperationResponseDto
        {
            UpdatedCount = successCount,
            Action = dto.Action.ToString(),
            Message = message,
            FailedIds = failedIds.Any() ? failedIds : null
        };
    }

    private IQueryable<Post> ApplyFilter(IQueryable<Post> query, PostFilterDto filter)
    {
        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(p => p.Status == filter.Status);

        if (!string.IsNullOrEmpty(filter.Platform))
            query = query.Where(p => p.Platform == filter.Platform);

        if (!string.IsNullOrEmpty(filter.InsightId))
            query = query.Where(p => p.InsightId == filter.InsightId);

        if (!string.IsNullOrEmpty(filter.ProjectId))
            query = query.Where(p => p.ProjectId == filter.ProjectId);

        if (filter.HasSchedule.HasValue)
        {
            query = filter.HasSchedule.Value
                ? query.Where(p => p.ScheduledPosts.Any())
                : query.Where(p => !p.ScheduledPosts.Any());
        }

        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.ToLower();
            query = query.Where(p => 
                p.Title.ToLower().Contains(searchTerm) ||
                p.Content.ToLower().Contains(searchTerm));
        }

        if (filter.CreatedAfter.HasValue)
            query = query.Where(p => p.CreatedAt >= filter.CreatedAfter.Value);

        if (filter.CreatedBefore.HasValue)
            query = query.Where(p => p.CreatedAt <= filter.CreatedBefore.Value);

        query = filter.SortBy?.ToLower() switch
        {
            "title" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(p => p.Title) 
                : query.OrderByDescending(p => p.Title),
            "platform" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(p => p.Platform) 
                : query.OrderByDescending(p => p.Platform),
            "status" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(p => p.Status) 
                : query.OrderByDescending(p => p.Status),
            "updatedat" => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(p => p.UpdatedAt) 
                : query.OrderByDescending(p => p.UpdatedAt),
            _ => filter.SortOrder?.ToLower() == "asc" 
                ? query.OrderBy(p => p.CreatedAt) 
                : query.OrderByDescending(p => p.CreatedAt)
        };

        var skip = (filter.Page - 1) * filter.PageSize;
        query = query.Skip(skip).Take(filter.PageSize);

        return query;
    }

    private string GenerateId(string prefix)
    {
        return $"{prefix}_{Guid.NewGuid():N}".Substring(0, 20);
    }
}