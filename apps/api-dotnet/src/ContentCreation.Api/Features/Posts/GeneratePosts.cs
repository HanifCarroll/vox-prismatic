using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Posts;

public static class GeneratePosts
{
    public record Request(
        Guid ProjectId,
        Guid UserId,
        string Platform = "LinkedIn",
        bool AutoApprove = false
    ) : IRequest<Response>;

    public record Response(bool IsSuccess, string? Error, int? PostCount)
    {
        public static Response Success(int postCount) => new(true, null, postCount);
        public static Response NotFound(string error) => new(false, error, null);
        public static Response BadRequest(string error) => new(false, error, null);
    }

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;
        private readonly IBackgroundJobService _jobService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            ApplicationDbContext db,
            IBackgroundJobService jobService,
            ILogger<Handler> logger)
        {
            _db = db;
            _jobService = jobService;
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

            var approvedInsights = project.Insights?.Where(i => i.IsApproved).ToList();
            if (approvedInsights == null || !approvedInsights.Any())
                return Response.BadRequest("No approved insights available for post generation");

            if (project.CurrentStage != ProjectStage.InsightsApproved && project.CurrentStage != ProjectStage.PostsGenerated)
                return Response.BadRequest($"Cannot generate posts in stage {project.CurrentStage}");

            try
            {
                // Use domain method to transition state if needed
                if (project.CurrentStage == ProjectStage.InsightsApproved)
                {
                    project.StartGeneratingPosts();
                    await _db.SaveChangesAsync(cancellationToken);
                }

                // Queue background job for post generation
                var jobId = _jobService.QueuePostGeneration(
                    project.Id, 
                    request.Platform, 
                    request.AutoApprove);

                _logger.LogInformation(
                    "Queued post generation for project {ProjectId} on platform {Platform} with job {JobId}", 
                    project.Id, request.Platform, jobId);

                return Response.Success(approvedInsights.Count); // Estimate based on insights
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid state for generating posts for project {ProjectId}", request.ProjectId);
                return Response.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate posts for project {ProjectId}", request.ProjectId);
                return Response.BadRequest($"Failed to generate posts: {ex.Message}");
            }
        }
    }
}