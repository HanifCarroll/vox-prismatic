using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Posts;

public static class ApprovePost
{
    public record Request(
        Guid ProjectId,
        Guid PostId,
        Guid UserId
    ) : IRequest<Response>;

    public record Response(bool IsSuccess, string? Error)
    {
        public static Response Success() => new(true, null);
        public static Response NotFound(string error) => new(false, error);
        public static Response BadRequest(string error) => new(false, error);
    }

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;
        private readonly IMediator _mediator;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext db,
            IMediator mediator,
            ILogger<Handler> logger)
        {
            _db = db;
            _mediator = mediator;
            _logger = logger;
        }

        public async Task<Response> Handle(Request request, CancellationToken cancellationToken)
        {
            var project = await _db.ContentProjects
                .Include(p => p.Posts)
                .FirstOrDefaultAsync(p => 
                    p.Id == request.ProjectId && 
                    p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            try
            {
                // Use the domain method to approve the post
                project.ApprovePost(request.PostId, request.UserId.ToString());

                await _db.SaveChangesAsync(cancellationToken);

                // Publish domain event
                await _mediator.Publish(new PostApprovedNotification(
                    request.ProjectId, 
                    request.PostId), cancellationToken);

                _logger.LogInformation("Approved post {PostId} for project {ProjectId}", 
                    request.PostId, request.ProjectId);

                return Response.Success();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Failed to approve post {PostId}", request.PostId);
                return Response.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to approve post {PostId}", request.PostId);
                return Response.BadRequest($"Failed to approve post: {ex.Message}");
            }
        }
    }

    // Domain event notification
    public record PostApprovedNotification(
        Guid ProjectId,
        Guid PostId
    ) : INotification;
}