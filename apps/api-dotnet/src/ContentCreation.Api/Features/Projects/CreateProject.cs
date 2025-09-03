using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Projects;

public static class CreateProject
{
    public record Request(
        string Title,
        string? Description,
        string SourceType,
        string? SourceUrl,
        string? FileName,
        string? FilePath,
        Guid UserId,
        List<string>? Tags
    ) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        string? Error,
        Guid? ProjectId
    )
    {
        public static Response Success(Guid projectId) => new(true, null, projectId);
        public static Response Failure(string error) => new(false, error, null);
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
                var project = new ContentProject
                {
                    Id = Guid.NewGuid(),
                    Title = request.Title,
                    Description = request.Description,
                    SourceType = request.SourceType,
                    SourceUrl = request.SourceUrl,
                    FileName = request.FileName,
                    FilePath = request.FilePath,
                    CurrentStage = "RawContent",
                    OverallProgress = 0,
                    UserId = request.UserId,
                    CreatedBy = request.UserId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastActivityAt = DateTime.UtcNow,
                    Tags = request.Tags ?? new List<string>()
                };

                _db.ContentProjects.Add(project);
                await _db.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Created project {ProjectId} with title {Title}", 
                    project.Id, project.Title);

                return Response.Success(project.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create project");
                return Response.Failure($"Failed to create project: {ex.Message}");
            }
        }
    }
}