using MediatR;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Publishing;

public static class SchedulePosts
{
    public record Request(
        Guid ProjectId,
        Guid UserId,
        List<ScheduleItem> Items
    ) : IRequest<Response>;

    public record ScheduleItem(
        Guid PostId,
        DateTime ScheduledFor,
        string TimeZone
    );

    public record Response(bool IsSuccess, string? Error, int? ScheduledCount)
    {
        public static Response Success(int scheduledCount) => new(true, null, scheduledCount);
        public static Response NotFound(string error) => new(false, error, null);
        public static Response BadRequest(string error) => new(false, error, null);
    }

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<Handler> _logger;

        public Handler(ApplicationDbContext db, ILogger<Handler> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<Response> Handle(Request request, CancellationToken cancellationToken)
        {
            var project = await _db.ContentProjects
                .Include(p => p.Posts)
                .Include(p => p.ScheduledPosts)
                .FirstOrDefaultAsync(p => 
                    p.Id == request.ProjectId && 
                    p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            if (project.CurrentStage != ProjectStage.PostsApproved && project.CurrentStage != ProjectStage.Scheduled)
                return Response.BadRequest($"Cannot schedule posts in stage {project.CurrentStage}");

            var scheduledCount = 0;

            try
            {
                foreach (var item in request.Items)
                {
                    var post = project.Posts?.FirstOrDefault(p => p.Id == item.PostId);
                    if (post == null || !post.IsApproved)
                        continue;

                    // Check if already scheduled
                    var existingSchedule = await _db.Set<ScheduledPost>()
                        .FirstOrDefaultAsync(sp => sp.PostId == item.PostId && sp.ProjectId == project.Id && sp.Status == ScheduledPostStatus.Pending, cancellationToken);
                    
                    if (existingSchedule != null)
                    {
                        existingSchedule.Reschedule(item.ScheduledFor.ToUniversalTime());
                    }
                    else
                    {
                        var scheduledPost = ScheduledPost.Create(
                            projectId: project.Id,
                            postId: item.PostId,
                            platform: SocialPlatform.LinkedIn.ToApiString(),
                            content: post.Content,
                            scheduledFor: item.ScheduledFor.ToUniversalTime(),
                            timeZone: item.TimeZone
                        );

                        _db.ScheduledPosts.Add(scheduledPost);
                    }

                    // Use domain method to mark post as scheduled
                    post.MarkAsScheduled();
                    scheduledCount++;
                }

                if (scheduledCount > 0)
                {
                    // Use domain method to transition to scheduled state
                    project.SchedulePosts();

                    await _db.SaveChangesAsync(cancellationToken);
                }

                _logger.LogInformation("Scheduled {Count} posts for project {ProjectId}", 
                    scheduledCount, request.ProjectId);

                return Response.Success(scheduledCount);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid state for scheduling posts for project {ProjectId}", request.ProjectId);
                return Response.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to schedule posts for project {ProjectId}", request.ProjectId);
                return Response.BadRequest($"Failed to schedule posts: {ex.Message}");
            }
        }
    }
}