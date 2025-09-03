using MediatR;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Features.Common.Interfaces;
using ContentCreation.Api.Features.Common.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Insights;

public static class ExtractInsights
{
    public record Request(
        Guid ProjectId,
        Guid UserId,
        bool AutoApprove = false
    ) : IRequest<Response>;

    public record Response(bool IsSuccess, string? Error, int? InsightCount)
    {
        public static Response Success(int insightCount) => new(true, null, insightCount);
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
                .Include(p => p.Transcript)
                .FirstOrDefaultAsync(p => 
                    p.Id == request.ProjectId && 
                    p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            if (project.Transcript == null || string.IsNullOrEmpty(project.Transcript.CleanedContent))
                return Response.BadRequest("Project transcript is not ready");

            if (project.CurrentStage != ProjectStage.ProcessingContent && project.CurrentStage != ProjectStage.InsightsReady)
                return Response.BadRequest($"Cannot extract insights in stage {project.CurrentStage}");

            try
            {
                // When insights are extracted, the project should transition to InsightsReady
                if (project.CurrentStage == ProjectStage.ProcessingContent)
                {
                    project.CompleteProcessing();
                    await _db.SaveChangesAsync(cancellationToken);
                }

                // Queue background job for insight extraction
                var jobId = _jobService.QueueInsightExtraction(project.Id, request.AutoApprove);

                _logger.LogInformation(
                    "Queued insight extraction for project {ProjectId} with job {JobId}", 
                    project.Id, jobId);

                return Response.Success(0); // Count will be updated by background job
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid state for extracting insights for project {ProjectId}", request.ProjectId);
                return Response.BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to extract insights for project {ProjectId}", request.ProjectId);
                return Response.BadRequest($"Failed to extract insights: {ex.Message}");
            }
        }
    }
}