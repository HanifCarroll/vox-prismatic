using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using AutoMapper;

namespace ContentCreation.Infrastructure.Services;

public class PostService : IPostService
{
    private readonly ILogger<PostService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public PostService(
        ILogger<PostService> logger,
        ApplicationDbContext context,
        IMapper mapper)
    {
        _logger = logger;
        _context = context;
        _mapper = mapper;
    }

    public async Task<PostDto> GetPostByIdAsync(string id)
    {
        var post = await _context.Posts
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }
        
        return _mapper.Map<PostDto>(post);
    }

    public async Task<List<PostDto>> GetPostsByProjectIdAsync(string projectId)
    {
        var posts = await _context.Posts
            .Where(p => p.ProjectId == projectId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        
        return _mapper.Map<List<PostDto>>(posts);
    }

    public async Task<PostDto> CreatePostAsync(CreatePostDto dto)
    {
        var post = new Post
        {
            ProjectId = dto.ProjectId,
            InsightId = dto.InsightId,
            Platform = dto.Platform,
            Content = dto.Content,
            Hashtags = dto.Hashtags,
            MediaUrls = dto.MediaUrls,
            Status = "draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created post {PostId} for project {ProjectId}", post.Id, post.ProjectId);
        
        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> UpdatePostAsync(string id, UpdatePostDto dto)
    {
        var post = await _context.Posts
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }
        
        if (dto.Content != null)
            post.Content = dto.Content;
        
        if (dto.Hashtags != null)
            post.Hashtags = dto.Hashtags;
        
        if (dto.MediaUrls != null)
            post.MediaUrls = dto.MediaUrls;
        
        if (dto.Status != null)
            post.Status = dto.Status;
        
        post.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Updated post {PostId}", post.Id);
        
        return _mapper.Map<PostDto>(post);
    }

    public async Task DeletePostAsync(string id)
    {
        var post = await _context.Posts
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }
        
        _context.Posts.Remove(post);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted post {PostId}", id);
    }

    public async Task<PostDto> ApprovePostAsync(string id)
    {
        var post = await _context.Posts
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }
        
        post.Status = "approved";
        post.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Approved post {PostId}", post.Id);
        
        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> RejectPostAsync(string id, string reason)
    {
        var post = await _context.Posts
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }
        
        post.Status = "rejected";
        post.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Rejected post {PostId} with reason: {Reason}", post.Id, reason);
        
        return _mapper.Map<PostDto>(post);
    }
}