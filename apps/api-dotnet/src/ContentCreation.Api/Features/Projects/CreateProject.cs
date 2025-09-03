using MediatR;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Features.Common.Entities;
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
                // Use the factory method to create the project with all parameters
                var project = ContentProject.Create(
                    title: request.Title,
                    description: request.Description,
                    sourceType: request.SourceType,
                    sourceUrl: request.SourceUrl,
                    fileName: request.FileName,
                    filePath: request.FilePath,
                    userId: request.UserId,
                    tags: request.Tags,
                    targetPlatforms: new List<string> { "linkedin" }
                );

                _db.ContentProjects.Add(project);
                await _db.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Created project {ProjectId} with title {Title}", 
                    project.Id, project.Title);

                return Response.Success(project.Id);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid project data");
                return Response.Failure(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create project");
                return Response.Failure($"Failed to create project: {ex.Message}");
            }
        }
    }
}