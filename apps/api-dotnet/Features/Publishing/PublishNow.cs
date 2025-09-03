using MediatR;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common;
using Microsoft.EntityFrameworkCore;
using FluentValidation;

namespace ContentCreation.Api.Features.Publishing;

public static class PublishNow
{
    public record Request(
        Guid ProjectId,
        List<Guid> PostIds,
        Guid UserId
    ) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        string? Error,
        int QueuedCount = 0,
        List<string> JobIds = null!
    )
    {
        public static Response Success(int count, List<string> jobIds) => 
            new(true, null, count, jobIds);
        public static Response NotFound(string message) => 
            new(false, message, 0, new List<string>());
        public static Response Failure(string error) => 
            new(false, error, 0, new List<string>());
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
        private readonly BackgroundJobService _backgroundJobService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext db, 
            BackgroundJobService backgroundJobService,
            ILogger<Handler> logger)
        {
            _db = db;
            _backgroundJobService = backgroundJobService;
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

                // Validate posts can be published
                var postsToPublish = new List<Common.Entities.Post>();
                foreach (var postId in request.PostIds)
                {
                    var post = project.Posts.FirstOrDefault(p => p.Id == postId);
                    if (post == null)
                    {
                        _logger.LogWarning("Post {PostId} not found in project {ProjectId}", 
                            postId, request.ProjectId);
                        continue;
                    }

                    if (post.Status != PostStatus.Approved && post.Status != PostStatus.Scheduled)
                    {
                        _logger.LogWarning("Post {PostId} cannot be published. Status: {Status}", 
                            postId, post.Status);
                        continue;
                    }

                    postsToPublish.Add(post);
                }

                if (!postsToPublish.Any())
                {
                    return Response.Failure("No posts are ready for publishing");
                }

                // Queue background jobs for immediate publishing
                var jobIds = new List<string>();
                foreach (var post in postsToPublish)
                {
                    // Update post status to indicate publishing
                    post.MarkAsScheduled(); // Will be changed to Published by the job

                    // Queue the publish job
                    var jobId = _backgroundJobService.QueuePublishNow(request.ProjectId, post.Id);
                    jobIds.Add(jobId);

                    _logger.LogInformation(
                        "Queued publish job {JobId} for post {PostId}", 
                        jobId, post.Id);
                }

                // Update project stage if needed
                if (project.CanPublish())
                {
                    project.StartPublishing();
                }

                // Create project activity
                var activity = new Common.Entities.ProjectActivity
                {
                    Id = Guid.NewGuid(),
                    ProjectId = request.ProjectId,
                    ActivityType = ProjectActivityType.PublishTriggered.ToString(),
                    Description = $"Queued {postsToPublish.Count} post(s) for immediate publishing",
                    Metadata = System.Text.Json.JsonSerializer.Serialize(new 
                    { 
                        PostIds = postsToPublish.Select(p => p.Id).ToList(),
                        JobIds = jobIds,
                        Count = postsToPublish.Count 
                    }),
                    OccurredAt = DateTime.UtcNow,
                    UserId = request.UserId
                };
                _db.ProjectActivities.Add(activity);

                await _db.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Queued {Count} posts for immediate publishing on project {ProjectId}", 
                    postsToPublish.Count, 
                    request.ProjectId);

                return Response.Success(postsToPublish.Count, jobIds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to queue posts for publishing on project {ProjectId}", 
                    request.ProjectId);
                return Response.Failure("Failed to queue posts for publishing");
            }
        }
    }
}