using MediatR;
using ContentCreation.Infrastructure.Data;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Projects;

public static class GetProject
{
    public record Request(Guid ProjectId, Guid UserId) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        string? Error,
        ProjectDto? Project
    )
    {
        public static Response Success(ProjectDto project) => new(true, null, project);
        public static Response NotFound(string error) => new(false, error, null);
    }

    public record ProjectDto(
        Guid Id,
        string Title,
        string? Description,
        string SourceType,
        string? SourceUrl,
        string? FileName,
        string CurrentStage,
        int OverallProgress,
        List<string> Tags,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        DateTime LastActivityAt,
        ProjectSummaryDto Summary
    );

    public record ProjectSummaryDto(
        int InsightsTotal,
        int InsightsApproved,
        int InsightsRejected,
        int PostsTotal,
        int PostsApproved,
        int PostsScheduled,
        int PostsPublished,
        int TranscriptWordCount
    );

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;

        public Handler(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<Response> Handle(Request request, CancellationToken cancellationToken)
        {
            var project = await _db.ContentProjects
                .Include(p => p.Transcript)
                .Include(p => p.Insights)
                .Include(p => p.Posts)
                .Include(p => p.ScheduledPosts)
                .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            var summary = new ProjectSummaryDto(
                InsightsTotal: project.Insights?.Count ?? 0,
                InsightsApproved: project.Insights?.Count(i => i.Status == "approved") ?? 0,
                InsightsRejected: project.Insights?.Count(i => i.Status == "rejected") ?? 0,
                PostsTotal: project.Posts?.Count ?? 0,
                PostsApproved: project.Posts?.Count(p => p.Status == PostStatus.Approved) ?? 0,
                PostsScheduled: project.ScheduledPosts?.Count(sp => sp.Status == ScheduledPostStatus.Pending) ?? 0,
                PostsPublished: project.ScheduledPosts?.Count(sp => sp.Status == ScheduledPostStatus.Published) ?? 0,
                TranscriptWordCount: project.Transcript?.WordCount ?? 0
            );

            var dto = new ProjectDto(
                Id: project.Id,
                Title: project.Title,
                Description: project.Description,
                SourceType: project.SourceType,
                SourceUrl: project.SourceUrl,
                FileName: project.FileName,
                CurrentStage: project.CurrentStage.ToString(),
                OverallProgress: project.OverallProgress,
                Tags: project.Tags ?? new List<string>(),
                CreatedAt: project.CreatedAt,
                UpdatedAt: project.UpdatedAt,
                LastActivityAt: project.LastActivityAt ?? project.UpdatedAt,
                Summary: summary
            );

            return Response.Success(dto);
        }
    }
}