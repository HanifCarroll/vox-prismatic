using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Insights;

public static class ApproveInsight
{
    public record Request(
        Guid ProjectId, 
        Guid InsightId, 
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
                .Include(p => p.Insights)
                .FirstOrDefaultAsync(p => 
                    p.Id == request.ProjectId && 
                    p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            try
            {
                // Use the domain method to approve the insight
                project.ApproveInsight(request.InsightId, request.UserId.ToString());

                await _db.SaveChangesAsync(cancellationToken);

                // Publish domain event
                await _mediator.Publish(new InsightApprovedNotification(
                    request.ProjectId, 
                    request.InsightId), cancellationToken);

                _logger.LogInformation("Approved insight {InsightId} for project {ProjectId}", 
                    request.InsightId, request.ProjectId);

                return Response.Success();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Failed to approve insight {InsightId}", request.InsightId);
                return Response.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to approve insight {InsightId}", request.InsightId);
                return Response.BadRequest($"Failed to approve insight: {ex.Message}");
            }
        }
    }

    // Domain event notification
    public record InsightApprovedNotification(
        Guid ProjectId, 
        Guid InsightId
    ) : INotification;
}