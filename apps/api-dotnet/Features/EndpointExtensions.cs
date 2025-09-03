using MediatR;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.Enums;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features;

public static class EndpointExtensions
{
    public static IEndpointRouteBuilder MapFeatureEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapProjectEndpoints();
        app.MapInsightEndpoints();
        app.MapPostEndpoints();
        app.MapPublishingEndpoints();
        app.MapDashboardEndpoints();
        app.MapAuthEndpoints();
        
        return app;
    }

    private static IEndpointRouteBuilder MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects")
            .WithTags("Projects")
            .WithOpenApi();

        // List projects
        group.MapGet("/", async (IMediator mediator, Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
            
            var result = await mediator.Send(new Projects.ListProjects.Request(userId.Value, null, null, null, 1, 20));
            return result.IsSuccess
                ? Results.Ok(result)
                : Results.BadRequest("Failed to retrieve projects");
        })
        .WithName("ListProjects");

        // Get project
        group.MapGet("/{id}", async (Guid id, IMediator mediator, Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
                
            var result = await mediator.Send(new Projects.GetProject.Request(id, userId.Value));
            return result.IsSuccess
                ? Results.Ok(result.Project)
                : Results.NotFound(result.Error);
        })
        .WithName("GetProject");

        // Create project
        group.MapPost("/", async (Projects.CreateProject.Request request, IMediator mediator) =>
        {
            var result = await mediator.Send(request);
            return result.IsSuccess
                ? Results.Created($"/api/projects/{result.ProjectId}", new { id = result.ProjectId })
                : Results.BadRequest(result.Error);
        })
        .WithName("CreateProject");

        // Update project
        group.MapPatch("/{id}", async (Guid id, Common.DTOs.UpdateProjectDto dto, IMediator mediator, Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
                
            var result = await mediator.Send(new Projects.UpdateProject.Request(
                id, 
                userId.Value,
                dto.Title,
                dto.Description,
                dto.Tags,
                dto.AutoApprovalSettings,
                dto.PublishingSchedule));
            return result.IsSuccess
                ? Results.Ok(new { message = "Project updated successfully" })
                : Results.BadRequest(result.Error);
        })
        .WithName("UpdateProject");

        // Delete project
        group.MapDelete("/{id}", async (Guid id, IMediator mediator, Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
                
            var result = await mediator.Send(new Projects.DeleteProject.Request(id, userId.Value));
            return result.IsSuccess
                ? Results.NoContent()
                : Results.BadRequest(result.Error);
        })
        .WithName("DeleteProject");

        // Process content
        group.MapPost("/{id}/process-content", async (Guid id, IMediator mediator, Guid userId) =>
        {
            var result = await mediator.Send(new Projects.ProcessContent.Request(id, userId));
            return result.IsSuccess
                ? Results.Ok(new { message = "Content processing started" })
                : Results.BadRequest(result.Error);
        })
        .WithName("ProcessContent");

        // Get project activities
        group.MapGet("/{id}/activities", async (Guid id, ApplicationDbContext db) =>
        {
            var activities = await db.ProjectActivities
                .Where(a => a.ProjectId == id)
                .OrderByDescending(a => a.OccurredAt)
                .Take(50)
                .ToListAsync();

            return Results.Ok(new { data = activities, total = activities.Count });
        })
        .WithName("GetProjectActivities");

        return app;
    }

    private static IEndpointRouteBuilder MapInsightEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects")
            .WithTags("Insights")
            .WithOpenApi();

        // Extract insights
        group.MapPost("/{id}/extract-insights", async (Guid id, IMediator mediator, Guid userId) =>
        {
            var result = await mediator.Send(new Insights.ExtractInsights.Request(id, userId));
            return result.IsSuccess
                ? Results.Ok(new { message = "Insight extraction started" })
                : Results.BadRequest(result.Error);
        })
        .WithName("ExtractInsights");

        // Get project insights
        group.MapGet("/{id}/insights", async (Guid id, ApplicationDbContext db) =>
        {
            var insights = await db.Insights
                .Where(i => i.ProjectId == id)
                .OrderBy(i => i.CreatedAt)
                .ToListAsync();

            return Results.Ok(new { data = insights, total = insights.Count });
        })
        .WithName("GetProjectInsights");

        // Update insight
        group.MapPatch("/{projectId}/insights/{insightId}", async (
            Guid projectId,
            Guid insightId,
            Insights.ApproveInsight.Request request,
            IMediator mediator) =>
        {
            var result = await mediator.Send(request with { ProjectId = projectId, InsightId = insightId });
            return result.IsSuccess
                ? Results.Ok()
                : Results.BadRequest(result.Error);
        })
        .WithName("UpdateInsight");

        // Approve multiple insights
        group.MapPost("/{id}/approve-insights", async (
            Guid id,
            List<Guid> insightIds,
            IMediator mediator,
            Guid userId) =>
        {
            var results = new List<object>();
            foreach (var insightId in insightIds)
            {
                var result = await mediator.Send(new Insights.ApproveInsight.Request(id, insightId, userId));
                results.Add(new { insightId, success = result.IsSuccess, error = result.Error });
            }

            return Results.Ok(results);
        })
        .WithName("ApproveInsights");

        // Reject insights
        group.MapPost("/{id}/reject-insights", async (
            Guid id,
            Common.DTOs.RejectInsightsDto dto,
            IMediator mediator,
            Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
                
            var result = await mediator.Send(new Insights.RejectInsights.Request(
                id, 
                dto.InsightIds.Select(Guid.Parse).ToList(),
                userId.Value,
                dto.RejectionReason));
            return result.IsSuccess
                ? Results.Ok(new { message = $"Rejected {result.RejectedCount} insights" })
                : Results.BadRequest(result.Error);
        })
        .WithName("RejectInsights");

        return app;
    }

    private static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects")
            .WithTags("Posts")
            .WithOpenApi();

        // Generate posts
        group.MapPost("/{id}/generate-posts", async (Guid id, IMediator mediator, Guid userId) =>
        {
            var result = await mediator.Send(new Posts.GeneratePosts.Request(id, userId));
            return result.IsSuccess
                ? Results.Ok(new { message = "Post generation started" })
                : Results.BadRequest(result.Error);
        })
        .WithName("GeneratePosts");

        // Get project posts
        group.MapGet("/{id}/posts", async (Guid id, ApplicationDbContext db) =>
        {
            var posts = await db.Posts
                .Where(p => p.ProjectId == id)
                .OrderBy(p => p.CreatedAt)
                .ToListAsync();

            return Results.Ok(new { data = posts, total = posts.Count });
        })
        .WithName("GetProjectPosts");

        // Update post
        group.MapPatch("/{projectId}/posts/{postId}", async (
            Guid projectId,
            Guid postId,
            Posts.ApprovePost.Request request,
            IMediator mediator) =>
        {
            var result = await mediator.Send(request with { ProjectId = projectId, PostId = postId });
            return result.IsSuccess
                ? Results.Ok()
                : Results.BadRequest(result.Error);
        })
        .WithName("UpdatePost");

        // Approve multiple posts
        group.MapPost("/{id}/approve-posts", async (
            Guid id,
            List<Guid> postIds,
            IMediator mediator,
            Guid userId) =>
        {
            var results = new List<object>();
            foreach (var postId in postIds)
            {
                var result = await mediator.Send(new Posts.ApprovePost.Request(id, postId, userId));
                results.Add(new { postId, success = result.IsSuccess, error = result.Error });
            }

            return Results.Ok(results);
        })
        .WithName("ApprovePosts");

        // Reject posts
        group.MapPost("/{id}/reject-posts", async (
            Guid id,
            Common.DTOs.RejectPostsDto dto,
            IMediator mediator,
            Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
                
            var result = await mediator.Send(new Posts.RejectPosts.Request(
                id, 
                dto.PostIds.Select(Guid.Parse).ToList(),
                userId.Value,
                dto.RejectionReason));
            return result.IsSuccess
                ? Results.Ok(new { message = $"Rejected {result.RejectedCount} posts" })
                : Results.BadRequest(result.Error);
        })
        .WithName("RejectPosts");

        return app;
    }

    private static IEndpointRouteBuilder MapPublishingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects")
            .WithTags("Publishing")
            .WithOpenApi();

        // Schedule posts
        group.MapPost("/{id}/schedule-posts", async (Guid id, List<Publishing.SchedulePosts.ScheduleItem> items, IMediator mediator, Guid userId) =>
        {
            var result = await mediator.Send(new Publishing.SchedulePosts.Request(id, userId, items));
            return result.IsSuccess
                ? Results.Ok(new { message = "Posts scheduled successfully" })
                : Results.BadRequest(result.Error);
        })
        .WithName("SchedulePosts");

        // Publish now
        group.MapPost("/{id}/publish-now", async (Guid id, Common.DTOs.PublishNowDto dto, IMediator mediator, Guid? userId) =>
        {
            if (!userId.HasValue)
                return Results.BadRequest("UserId is required");
                
            var result = await mediator.Send(new Publishing.PublishNow.Request(
                id, 
                dto.PostIds.Select(Guid.Parse).ToList(),
                userId.Value));
            return result.IsSuccess
                ? Results.Ok(new { 
                    message = $"Queued {result.QueuedCount} posts for publishing", 
                    jobIds = result.JobIds 
                })
                : Results.BadRequest(result.Error);
        })
        .WithName("PublishNow");

        return app;
    }

    private static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dashboard", async (IMediator mediator, Guid? userId) =>
        {
            var result = await mediator.Send(new Dashboard.GetDashboard.Request(userId ?? Guid.Empty));
            return Results.Ok(result);
        })
        .WithName("GetDashboard")
        .WithTags("Dashboard")
        .WithOpenApi();

        app.MapGet("/api/dashboard/project-overview", async (ApplicationDbContext db, Guid? userId) =>
        {
            var query = db.ContentProjects.AsQueryable();
            
            if (userId.HasValue)
                query = query.Where(p => p.UserId == userId.Value);

            var projects = await query
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.CurrentStage,
                    p.OverallProgress,
                    p.LastActivityAt,
                    InsightsCount = p.Insights.Count,
                    PostsCount = p.Posts.Count
                })
                .OrderByDescending(p => p.LastActivityAt)
                .Take(10)
                .ToListAsync();

            return Results.Ok(new { data = projects });
        })
        .WithName("GetProjectOverview")
        .WithTags("Dashboard")
        .WithOpenApi();

        return app;
    }

    private static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication")
            .WithOpenApi();

        // LinkedIn OAuth endpoints  
        group.MapGet("/linkedin/auth", async (IMediator mediator) =>
        {
            var result = await mediator.Send(new ContentCreation.Api.Features.Auth.GetLinkedInAuthUrl.Request());
            if (result.IsSuccess)
                return Results.Ok(new { authUrl = result.AuthUrl });
            return Results.Problem(result.Error);
        })
        .WithName("InitiateLinkedInAuth")
        .AllowAnonymous();

        group.MapGet("/linkedin/callback", async (
            string code,
            string state,
            IMediator mediator,
            ApplicationDbContext db) =>
        {
            var result = await mediator.Send(new ContentCreation.Api.Features.Auth.HandleLinkedInCallback.Request(code, state));
            if (result.IsSuccess)
                return Results.Ok(new { message = result.Message });
            return Results.BadRequest(new { error = result.Error });
        })
        .WithName("LinkedInCallback")
        .AllowAnonymous();

        group.MapGet("/linkedin/status", async (Guid userId, ApplicationDbContext db) =>
        {
            var token = await db.OAuthTokens
                .Where(t => t.UserId == userId && t.Platform == SocialPlatform.LinkedIn)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            return Results.Ok(new
            {
                isConnected = token != null && token.ExpiresAt > DateTime.UtcNow,
                expiresAt = token?.ExpiresAt
            });
        })
        .WithName("LinkedInStatus");

        group.MapPost("/linkedin/revoke", async (Guid userId, ApplicationDbContext db) =>
        {
            var tokens = await db.OAuthTokens
                .Where(t => t.UserId == userId && t.Platform == SocialPlatform.LinkedIn)
                .ToListAsync();

            db.OAuthTokens.RemoveRange(tokens);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "LinkedIn connection revoked" });
        })
        .WithName("RevokeLinkedIn");

        return app;
    }
}