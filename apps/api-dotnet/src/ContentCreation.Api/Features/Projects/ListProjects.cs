using MediatR;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Projects;

public static class ListProjects
{
    public record Request(
        Guid UserId,
        string? SearchTerm,
        string? Stage,
        List<string>? Tags,
        int Page = 1,
        int PageSize = 20
    ) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        List<ProjectListItemDto> Projects,
        int TotalCount
    )
    {
        public static Response Success(List<ProjectListItemDto> projects, int totalCount) 
            => new(true, projects, totalCount);
    }

    public record ProjectListItemDto(
        Guid Id,
        string Title,
        string? Description,
        string CurrentStage,
        int OverallProgress,
        List<string> Tags,
        DateTime LastActivityAt,
        int InsightsCount,
        int PostsCount,
        int PublishedCount
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
            var query = _db.ContentProjects
                .Include(p => p.Insights)
                .Include(p => p.Posts)
                .Include(p => p.ScheduledPosts)
                .Where(p => p.UserId == request.UserId)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(p => 
                    p.Title.Contains(request.SearchTerm) || 
                    (p.Description != null && p.Description.Contains(request.SearchTerm)));
            }

            if (!string.IsNullOrEmpty(request.Stage))
            {
                query = query.Where(p => p.CurrentStage == request.Stage);
            }

            if (request.Tags != null && request.Tags.Any())
            {
                query = query.Where(p => p.Tags != null && p.Tags.Any(t => request.Tags.Contains(t)));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var projects = await query
                .OrderByDescending(p => p.LastActivityAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(p => new ProjectListItemDto(
                    p.Id,
                    p.Title,
                    p.Description,
                    p.CurrentStage,
                    p.OverallProgress,
                    p.Tags ?? new List<string>(),
                    p.LastActivityAt ?? p.UpdatedAt,
                    p.Insights != null ? p.Insights.Count : 0,
                    p.Posts != null ? p.Posts.Count : 0,
                    p.ScheduledPosts != null ? p.ScheduledPosts.Count(sp => sp.Status == "Published") : 0
                ))
                .ToListAsync(cancellationToken);

            return Response.Success(projects, totalCount);
        }
    }
}