using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using ContentCreation.Api.Features.Common;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Publishing;

public static class PublishToLinkedIn
{
    public record Request(
        Guid ProjectId,
        Guid PostId,
        Guid UserId,
        bool PublishNow = false
    ) : IRequest<Response>;

    public record Response(bool IsSuccess, string? Error, string? PublishedUrl)
    {
        public static Response Success(string publishedUrl) => new(true, null, publishedUrl);
        public static Response NotFound(string error) => new(false, error, null);
        public static Response BadRequest(string error) => new(false, error, null);
    }

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;
        private readonly ISocialPostPublisher _publisher;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext db,
            ISocialPostPublisher publisher,
            ILogger<Handler> logger)
        {
            _db = db;
            _publisher = publisher;
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

            var post = project.Posts?.FirstOrDefault(p => p.Id == request.PostId);
            if (post == null)
                return Response.NotFound("Post not found");

            if (!post.IsApproved && post.Status != PostStatus.Scheduled)
                return Response.BadRequest($"Cannot publish post that is not approved or scheduled");

            try
            {
                // Get or create scheduled post entry
                var scheduledPost = await _db.Set<Core.Entities.ScheduledPost>()
                    .FirstOrDefaultAsync(sp => sp.PostId == request.PostId && sp.ProjectId == request.ProjectId, cancellationToken);

                if (scheduledPost == null)
                {
                    scheduledPost = new Core.Entities.ScheduledPost
                    {
                        Id = Guid.NewGuid(),
                        ProjectId = project.Id,
                        PostId = request.PostId,
                        Platform = "LinkedIn",
                        ScheduledFor = request.PublishNow ? DateTime.UtcNow : DateTime.UtcNow.AddMinutes(5),
                        Status = ScheduledPostStatus.Processing,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _db.ScheduledPosts.Add(scheduledPost);
                }
                else
                {
                    scheduledPost.Status = ScheduledPostStatus.Processing;
                    scheduledPost.UpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync(cancellationToken);

                // Publish to LinkedIn using the post
                var publishedId = await _publisher.PublishToSocialMedia(post, "LinkedIn");
                var isSuccess = publishedId != null;
                var publishedUrl = isSuccess ? $"https://linkedin.com/posts/{publishedId}" : null;
                var error = isSuccess ? null : "Failed to publish";

                if (isSuccess)
                {
                    scheduledPost.Status = ScheduledPostStatus.Published;
                    scheduledPost.PublishedAt = DateTime.UtcNow;
                    scheduledPost.PublishUrl = publishedUrl;
                    
                    // Use domain method to mark post as published
                    post.MarkAsPublished();

                    // Use domain methods to update project state
                    if (project.CurrentStage == ProjectStage.Scheduled || project.CurrentStage == ProjectStage.PostsApproved)
                    {
                        project.StartPublishing();
                    }
                    
                    // Check if all posts are published and complete publishing
                    var allPublished = project.Posts?.All(p => p.Status == PostStatus.Published) ?? false;
                    if (allPublished && project.CurrentStage == ProjectStage.Publishing)
                    {
                        project.CompletePublishing();
                    }
                }
                else
                {
                    scheduledPost.Status = ScheduledPostStatus.Failed;
                    scheduledPost.ErrorMessage = error;
                    scheduledPost.UpdatedAt = DateTime.UtcNow;
                    
                    // Use domain method to mark post as failed
                    post.MarkAsFailed(error ?? "Failed to publish to LinkedIn");
                    
                    // If in publishing state and this causes all posts to fail, handle it
                    var anySuccessful = project.Posts?.Any(p => p.Status == PostStatus.Published) ?? false;
                    if (project.CurrentStage == ProjectStage.Publishing && !anySuccessful)
                    {
                        project.FailPublishing(error ?? "Failed to publish");
                    }
                }

                await _db.SaveChangesAsync(cancellationToken);

                if (isSuccess)
                {
                    _logger.LogInformation("Published post {PostId} to LinkedIn with URL {Url}", 
                        request.PostId, publishedUrl);
                    return Response.Success(publishedUrl ?? string.Empty);
                }
                else
                {
                    _logger.LogError("Failed to publish post {PostId}: {Error}", 
                        request.PostId, error);
                    return Response.BadRequest(error ?? "Failed to publish");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish post {PostId} to LinkedIn", request.PostId);
                return Response.BadRequest($"Failed to publish: {ex.Message}");
            }
        }
    }
}