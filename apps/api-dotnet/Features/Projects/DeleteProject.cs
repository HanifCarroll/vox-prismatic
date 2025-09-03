using MediatR;
using ContentCreation.Api.Features.Common.Data;
using Microsoft.EntityFrameworkCore;
using FluentValidation;

namespace ContentCreation.Api.Features.Projects;

public static class DeleteProject
{
    public record Request(
        Guid ProjectId,
        Guid UserId
    ) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        string? Error
    )
    {
        public static Response Success() => new(true, null);
        public static Response NotFound(string message) => new(false, message);
        public static Response Failure(string error) => new(false, error);
    }

    public class Validator : AbstractValidator<Request>
    {
        public Validator()
        {
            RuleFor(x => x.ProjectId).NotEmpty();
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
                    .Include(p => p.Insights)
                    .Include(p => p.Posts)
                    .Include(p => p.ScheduledPosts)
                    .Include(p => p.Activities)
                    .FirstOrDefaultAsync(p => 
                        p.Id == request.ProjectId && 
                        p.CreatedBy == request.UserId, 
                        cancellationToken);

                if (project == null)
                {
                    return Response.NotFound("Project not found or access denied");
                }

                // Delete related entities (cascade delete should handle most of this)
                if (project.Insights.Any())
                {
                    _db.Insights.RemoveRange(project.Insights);
                }

                if (project.Posts.Any())
                {
                    _db.Posts.RemoveRange(project.Posts);
                }

                if (project.ScheduledPosts.Any())
                {
                    _db.ScheduledPosts.RemoveRange(project.ScheduledPosts);
                }

                if (project.Activities.Any())
                {
                    _db.ProjectActivities.RemoveRange(project.Activities);
                }

                // Delete associated transcript if exists
                if (project.TranscriptId.HasValue)
                {
                    var transcript = await _db.Transcripts
                        .FirstOrDefaultAsync(t => t.Id == project.TranscriptId.Value, cancellationToken);
                    if (transcript != null)
                    {
                        _db.Transcripts.Remove(transcript);
                    }
                }

                // Delete the project itself
                _db.ContentProjects.Remove(project);
                
                await _db.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Project {ProjectId} and all related data deleted successfully", request.ProjectId);
                return Response.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete project {ProjectId}", request.ProjectId);
                return Response.Failure("Failed to delete project");
            }
        }
    }
}