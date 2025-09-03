using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Entities;
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

            if (project.CurrentStage != "PostsApproved" && project.CurrentStage != "Scheduled")
                return Response.BadRequest($"Cannot schedule posts in stage {project.CurrentStage}");

            var scheduledCount = 0;

            try
            {
                foreach (var item in request.Items)
                {
                    var post = project.Posts?.FirstOrDefault(p => p.Id == item.PostId);
                    if (post == null || post.Status != "approved")
                        continue;

                    // Check if already scheduled
                    var existingSchedule = await _db.Set<ScheduledPost>()
                        .FirstOrDefaultAsync(sp => sp.PostId == item.PostId && sp.ProjectId == project.Id && sp.Status == "Pending", cancellationToken);
                    
                    if (existingSchedule != null)
                    {
                        // Update existing schedule
                        existingSchedule.ScheduledFor = item.ScheduledFor.ToUniversalTime();
                        existingSchedule.TimeZone = item.TimeZone;
                        existingSchedule.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        // Create new scheduled post
                        var scheduledPost = new ScheduledPost
                        {
                            Id = Guid.NewGuid(),
                            ProjectId = project.Id,
                            PostId = item.PostId,
                            Platform = "LinkedIn",
                            ScheduledFor = item.ScheduledFor.ToUniversalTime(),
                            TimeZone = item.TimeZone,
                            Status = "Pending",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _db.ScheduledPosts.Add(scheduledPost);
                    }

                    post.Status = "scheduled";
                    scheduledCount++;
                }

                if (scheduledCount > 0)
                {
                    project.CurrentStage = "Scheduled";
                    project.OverallProgress = 70;
                    project.LastActivityAt = DateTime.UtcNow;
                    project.UpdatedAt = DateTime.UtcNow;

                    await _db.SaveChangesAsync(cancellationToken);
                }

                _logger.LogInformation("Scheduled {Count} posts for project {ProjectId}", 
                    scheduledCount, request.ProjectId);

                return Response.Success(scheduledCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to schedule posts for project {ProjectId}", request.ProjectId);
                return Response.BadRequest($"Failed to schedule posts: {ex.Message}");
            }
        }
    }
}