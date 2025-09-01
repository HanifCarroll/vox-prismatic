using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using AutoMapper;
using Hangfire;

namespace ContentCreation.Infrastructure.Services;

public class PostStateService : IPostStateService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<PostStateService> _logger;

    public PostStateService(
        ApplicationDbContext context,
        IMapper mapper,
        IBackgroundJobClient backgroundJobClient,
        ILogger<PostStateService> logger)
    {
        _context = context;
        _mapper = mapper;
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    public async Task<PostDto> SubmitForReviewAsync(string id)
    {
        _logger.LogInformation("Submitting post {PostId} for review", id);

        var post = await _context.Posts.FindAsync(id);
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!CanTransition(post.Status, PostAction.SubmitForReview))
        {
            throw new InvalidOperationException($"Cannot submit post for review from status: {post.Status}");
        }

        post.Status = "needs_review";
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Post {PostId} submitted for review", id);
        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> ApprovePostAsync(string id, string approvedBy)
    {
        _logger.LogInformation("Approving post {PostId}", id);

        var post = await _context.Posts
            .Include(p => p.ContentProject)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!CanTransition(post.Status, PostAction.Approve))
        {
            throw new InvalidOperationException($"Cannot approve post from status: {post.Status}");
        }

        post.Status = "approved";
        post.ApprovedBy = approvedBy;
        post.ApprovedAt = DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;

        // Clear rejection fields if any
        post.RejectedBy = null;
        post.RejectedAt = null;
        post.RejectedReason = null;

        await _context.SaveChangesAsync();

        // Update project lifecycle if needed
        await UpdateProjectLifecycleAsync(post.ProjectId);

        _logger.LogInformation("Post {PostId} approved by {ApprovedBy}", id, approvedBy);
        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> RejectPostAsync(string id, string rejectedBy, string reason)
    {
        _logger.LogInformation("Rejecting post {PostId}", id);

        var post = await _context.Posts.FindAsync(id);
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!CanTransition(post.Status, PostAction.Reject))
        {
            throw new InvalidOperationException($"Cannot reject post from status: {post.Status}");
        }

        post.Status = "draft"; // Rejected posts go back to draft
        post.RejectedBy = rejectedBy;
        post.RejectedAt = DateTime.UtcNow;
        post.RejectedReason = reason;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Post {PostId} rejected by {RejectedBy}", id, rejectedBy);
        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> ArchivePostAsync(string id, string reason)
    {
        _logger.LogInformation("Archiving post {PostId}", id);

        var post = await _context.Posts.FindAsync(id);
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!CanTransition(post.Status, PostAction.Archive))
        {
            throw new InvalidOperationException($"Cannot archive post from status: {post.Status}");
        }

        post.Status = "archived";
        post.ArchivedAt = DateTime.UtcNow;
        post.ArchivedReason = reason;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Post {PostId} archived", id);
        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> SchedulePostAsync(string id, DateTime scheduledTime, string? timeZone = null)
    {
        _logger.LogInformation("Scheduling post {PostId} for {ScheduledTime}", id, scheduledTime);

        var post = await _context.Posts
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!CanTransition(post.Status, PostAction.Schedule))
        {
            throw new InvalidOperationException($"Cannot schedule post from status: {post.Status}");
        }

        // Convert scheduled time to UTC if timezone provided
        var utcScheduledTime = scheduledTime;
        if (!string.IsNullOrEmpty(timeZone) && timeZone != "UTC")
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
                utcScheduledTime = TimeZoneInfo.ConvertTimeToUtc(scheduledTime, tz);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Invalid timezone {TimeZone}, using provided time as UTC", timeZone);
            }
        }

        // Check if already scheduled
        var existingSchedule = post.ScheduledPosts?.FirstOrDefault(sp => sp.Status == "pending");
        if (existingSchedule != null)
        {
            // Update existing schedule
            existingSchedule.ScheduledTime = utcScheduledTime;
            existingSchedule.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // Create new scheduled post
            var scheduledPost = new ProjectScheduledPost
            {
                Id = GenerateId("scheduled"),
                ProjectId = post.ProjectId,
                PostId = post.Id,
                Platform = post.Platform,
                ScheduledTime = utcScheduledTime,
                Status = "pending",
                RetryCount = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.ProjectScheduledPosts.Add(scheduledPost);
        }

        post.Status = "scheduled";
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Schedule the publishing job with Hangfire
        var jobId = _backgroundJobClient.Schedule(
            () => PublishPost(id),
            utcScheduledTime);
        
        _logger.LogInformation("Scheduled publishing job {JobId} for post {PostId} at {ScheduledTime}", 
            jobId, id, utcScheduledTime);

        return _mapper.Map<PostDto>(post);
    }

    public async Task<PostDto> UnschedulePostAsync(string id)
    {
        _logger.LogInformation("Unscheduling post {PostId}", id);

        var post = await _context.Posts
            .Include(p => p.ScheduledPosts)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        if (!CanTransition(post.Status, PostAction.Unschedule))
        {
            throw new InvalidOperationException($"Cannot unschedule post from status: {post.Status}");
        }

        // Cancel scheduled posts
        var scheduledPosts = post.ScheduledPosts?.Where(sp => sp.Status == "pending").ToList();
        if (scheduledPosts?.Any() == true)
        {
            foreach (var sp in scheduledPosts)
            {
                sp.Status = "cancelled";
                sp.UpdatedAt = DateTime.UtcNow;
            }
        }

        post.Status = "approved"; // Go back to approved status
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Post {PostId} unscheduled", id);
        return _mapper.Map<PostDto>(post);
    }

    public async Task<AvailableActionsDto> GetAvailableActionsAsync(string id)
    {
        var post = await _context.Posts.FindAsync(id);
        if (post == null)
        {
            throw new KeyNotFoundException($"Post with ID {id} not found");
        }

        var availableActions = GetAvailableActions(post.Status);

        return new AvailableActionsDto
        {
            CurrentState = post.Status,
            AvailableActions = availableActions
        };
    }

    public async Task<bool> CanTransitionAsync(string id, PostAction action)
    {
        var post = await _context.Posts.FindAsync(id);
        if (post == null)
        {
            return false;
        }

        return CanTransition(post.Status, action);
    }

    private bool CanTransition(string currentStatus, PostAction action)
    {
        return (currentStatus, action) switch
        {
            ("draft", PostAction.SubmitForReview) => true,
            ("draft", PostAction.Archive) => true,
            ("draft", PostAction.Delete) => true,
            ("draft", PostAction.Edit) => true,
            
            ("needs_review", PostAction.Approve) => true,
            ("needs_review", PostAction.Reject) => true,
            ("needs_review", PostAction.Archive) => true,
            ("needs_review", PostAction.Edit) => true,
            
            ("approved", PostAction.Schedule) => true,
            ("approved", PostAction.Archive) => true,
            ("approved", PostAction.Edit) => true,
            ("approved", PostAction.SubmitForReview) => true,
            
            ("scheduled", PostAction.Unschedule) => true,
            ("scheduled", PostAction.Archive) => true,
            
            ("published", PostAction.Archive) => true,
            
            ("failed", PostAction.Archive) => true,
            ("failed", PostAction.SubmitForReview) => true,
            ("failed", PostAction.Edit) => true,
            
            ("archived", PostAction.Delete) => true,
            
            _ => false
        };
    }

    private List<string> GetAvailableActions(string currentStatus)
    {
        var actions = new List<string>();

        foreach (PostAction action in Enum.GetValues(typeof(PostAction)))
        {
            if (CanTransition(currentStatus, action))
            {
                actions.Add(action.ToString());
            }
        }

        return actions;
    }

    private async Task UpdateProjectLifecycleAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Posts)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null) return;

        var approvedPosts = project.Posts.Count(p => p.Status == "approved");
        var totalPosts = project.Posts.Count;

        if (approvedPosts > 0 && project.CurrentStage == ProjectLifecycleStage.PostsGenerated)
        {
            project.CurrentStage = ProjectLifecycleStage.PostsApproved;
            project.LastActivityAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Updated project {ProjectId} to PostsApproved stage", projectId);
        }
    }

    // This method would be executed by Hangfire
    public static void PublishPost(string postId)
    {
        // This would be implemented to publish the post to social media
        // For now, it's a placeholder
        Console.WriteLine($"Publishing post: {postId}");
    }

    private string GenerateId(string prefix)
    {
        return $"{prefix}_{Guid.NewGuid():N}".Substring(0, 20);
    }
}