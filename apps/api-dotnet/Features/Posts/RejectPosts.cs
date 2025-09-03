using MediatR;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.Enums;
using Microsoft.EntityFrameworkCore;
using FluentValidation;

namespace ContentCreation.Api.Features.Posts;

public static class RejectPosts
{
    public record Request(
        Guid ProjectId,
        List<Guid> PostIds,
        Guid UserId,
        string? Reason = null
    ) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        string? Error,
        int RejectedCount = 0
    )
    {
        public static Response Success(int count) => new(true, null, count);
        public static Response NotFound(string message) => new(false, message, 0);
        public static Response Failure(string error) => new(false, error, 0);
    }

    public class Validator : AbstractValidator<Request>
    {
        public Validator()
        {
            RuleFor(x => x.ProjectId).NotEmpty();
            RuleFor(x => x.PostIds).NotEmpty()
                .Must(ids => ids.All(id => id != Guid.Empty))
                .WithMessage("All post IDs must be valid");
            RuleFor(x => x.UserId).NotEmpty();
        }
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
            try
            {
                var project = await _db.ContentProjects
                    .Include(p => p.Posts)
                    .FirstOrDefaultAsync(p => 
                        p.Id == request.ProjectId && 
                        p.CreatedBy == request.UserId, 
                        cancellationToken);

                if (project == null)
                {
                    return Response.NotFound("Project not found or access denied");
                }

                int rejectedCount = 0;
                var reason = request.Reason ?? "Rejected by user";

                foreach (var postId in request.PostIds)
                {
                    var post = project.Posts.FirstOrDefault(p => p.Id == postId);
                    if (post != null && post.Status != PostStatus.Rejected)
                    {
                        // Use domain method to reject
                        project.RejectPost(postId, request.UserId.ToString(), reason);
                        rejectedCount++;
                    }
                }

                if (rejectedCount > 0)
                {
                    // Create project activity
                    var activity = new Common.Entities.ProjectActivity
                    {
                        Id = Guid.NewGuid(),
                        ProjectId = request.ProjectId,
                        ActivityType = ProjectActivityType.PostsRejected.ToString(),
                        Description = $"Rejected {rejectedCount} post(s)",
                        Metadata = System.Text.Json.JsonSerializer.Serialize(new 
                        { 
                            PostIds = request.PostIds,
                            Reason = reason,
                            Count = rejectedCount 
                        }),
                        OccurredAt = DateTime.UtcNow,
                        UserId = request.UserId
                    };
                    _db.ProjectActivities.Add(activity);

                    await _db.SaveChangesAsync(cancellationToken);
                }

                _logger.LogInformation(
                    "Rejected {Count} posts for project {ProjectId}", 
                    rejectedCount, 
                    request.ProjectId);

                return Response.Success(rejectedCount);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Business rule violation while rejecting posts");
                return Response.Failure(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reject posts for project {ProjectId}", request.ProjectId);
                return Response.Failure("Failed to reject posts");
            }
        }
    }
}