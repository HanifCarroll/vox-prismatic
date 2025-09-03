using MediatR;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Features.Common.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Dashboard;

public static class GetDashboard
{
    public record Request(Guid UserId) : IRequest<Response>;

    public record Response(
        bool IsSuccess,
        DashboardDto? Dashboard
    )
    {
        public static Response Success(DashboardDto dashboard) => new(true, dashboard);
    }

    public record DashboardDto(
        ProjectOverviewDto Overview,
        List<ActionItemDto> ActionItems,
        List<RecentActivityDto> RecentActivities
    );

    public record ProjectOverviewDto(
        int TotalProjects,
        Dictionary<string, int> ProjectsByStage,
        int InsightsNeedingReview,
        int PostsNeedingReview,
        int PostsReadyToSchedule,
        int PostsPublishedToday
    );

    public record ActionItemDto(
        Guid ProjectId,
        string ProjectTitle,
        string ActionType,
        string Description,
        int Count
    );

    public record RecentActivityDto(
        Guid ProjectId,
        string ProjectTitle,
        string ActivityType,
        string Description,
        DateTime OccurredAt
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
            var projects = await _db.ContentProjects
                .Include(p => p.Insights)
                .Include(p => p.Posts)
                .Include(p => p.ScheduledPosts)
                .Where(p => p.UserId == request.UserId)
                .ToListAsync(cancellationToken);

            // Project overview
            var overview = new ProjectOverviewDto(
                TotalProjects: projects.Count,
                ProjectsByStage: projects
                    .GroupBy(p => p.CurrentStage)
                    .ToDictionary(g => g.Key.ToString(), g => g.Count()),
                InsightsNeedingReview: projects
                    .Sum(p => p.Insights?.Count(i => i.Status == InsightStatus.Draft) ?? 0),
                PostsNeedingReview: projects
                    .Sum(p => p.Posts?.Count(post => post.Status == PostStatus.Draft) ?? 0),
                PostsReadyToSchedule: projects
                    .Sum(p => p.Posts?.Count(post => post.Status == PostStatus.Approved) ?? 0),
                PostsPublishedToday: projects
                    .Sum(p => p.ScheduledPosts?.Count(sp => 
                        sp.Status == ScheduledPostStatus.Published && 
                        sp.PublishedAt?.Date == DateTime.UtcNow.Date) ?? 0)
            );

            // Action items
            var actionItems = new List<ActionItemDto>();
            
            foreach (var project in projects)
            {
                var draftInsights = project.Insights?.Count(i => i.Status == InsightStatus.Draft) ?? 0;
                if (draftInsights > 0)
                {
                    actionItems.Add(new ActionItemDto(
                        project.Id,
                        project.Title,
                        "ReviewInsights",
                        "Review and approve insights",
                        draftInsights
                    ));
                }

                var draftPosts = project.Posts?.Count(p => p.Status == PostStatus.Draft) ?? 0;
                if (draftPosts > 0)
                {
                    actionItems.Add(new ActionItemDto(
                        project.Id,
                        project.Title,
                        "ReviewPosts",
                        "Review and approve posts",
                        draftPosts
                    ));
                }

                var approvedPosts = project.Posts?.Count(p => p.Status == PostStatus.Approved) ?? 0;
                if (approvedPosts > 0)
                {
                    actionItems.Add(new ActionItemDto(
                        project.Id,
                        project.Title,
                        "SchedulePosts",
                        "Schedule approved posts",
                        approvedPosts
                    ));
                }
            }

            // Recent activities (last 10)
            var recentActivities = projects
                .SelectMany(p => new[]
                {
                    new RecentActivityDto(
                        p.Id,
                        p.Title,
                        "ProjectUpdated",
                        $"Project in stage: {p.CurrentStage}",
                        p.LastActivityAt ?? p.UpdatedAt
                    )
                })
                .OrderByDescending(a => a.OccurredAt)
                .Take(10)
                .ToList();

            var dashboard = new DashboardDto(
                overview,
                actionItems,
                recentActivities
            );

            return Response.Success(dashboard);
        }
    }
}