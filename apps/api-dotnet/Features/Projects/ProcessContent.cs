using MediatR;
using ContentCreation.Api.Features.Common.Data;
using Microsoft.EntityFrameworkCore;
using ContentCreation.Api.Features.Common.Enums;
using Hangfire;

namespace ContentCreation.Api.Features.Projects;

public static class ProcessContent
{
    public record Request(Guid ProjectId, Guid UserId) : IRequest<Response>;

    public record Response(bool IsSuccess, string? Error)
    {
        public static Response Success() => new(true, null);
        public static Response NotFound(string error) => new(false, error);
        public static Response BadRequest(string error) => new(false, error);
    }

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext db,
            ILogger<Handler> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<Response> Handle(Request request, CancellationToken cancellationToken)
        {
            var project = await _db.ContentProjects
                .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            if (project.CurrentStage != ProjectStage.RawContent)
                return Response.BadRequest($"Cannot process content in stage {project.CurrentStage}");

            try
            {
                // Use domain method to transition to processing stage
                project.StartProcessing();

                await _db.SaveChangesAsync(cancellationToken);

                // Queue background job for processing
                BackgroundJob.Enqueue<BackgroundJobs.ProcessContentJob>(job => job.ProcessContentAsync(project.Id));

                _logger.LogInformation("Started processing content for project {ProjectId}", project.Id);

                return Response.Success();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid state for processing content for project {ProjectId}", request.ProjectId);
                return Response.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process content for project {ProjectId}", request.ProjectId);
                return Response.BadRequest($"Failed to process content: {ex.Message}");
            }
        }
    }
}