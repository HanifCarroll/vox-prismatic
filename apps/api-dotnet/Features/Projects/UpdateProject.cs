using MediatR;
using ContentCreation.Api.Features.Common.Data;
using ContentCreation.Api.Features.Common.DTOs;
using Microsoft.EntityFrameworkCore;
using FluentValidation;

namespace ContentCreation.Api.Features.Projects;

public static class UpdateProject
{
    public record Request(
        Guid ProjectId,
        Guid UserId,
        string? Title,
        string? Description,
        List<string>? Tags,
        AutoApprovalSettings? AutoApprovalSettings,
        PublishingSchedule? PublishingSchedule
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
            RuleFor(x => x.Title)
                .MaximumLength(200)
                .When(x => x.Title != null);
            RuleFor(x => x.Description)
                .MaximumLength(1000)
                .When(x => x.Description != null);
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
                    .FirstOrDefaultAsync(p => 
                        p.Id == request.ProjectId && 
                        p.CreatedBy == request.UserId, 
                        cancellationToken);

                if (project == null)
                {
                    return Response.NotFound("Project not found or access denied");
                }

                // Update project details using domain method
                project.UpdateDetails(
                    title: request.Title,
                    description: request.Description,
                    tags: request.Tags
                );

                // Update auto-approval settings if provided
                if (request.AutoApprovalSettings != null)
                {
                    project.ConfigureAutoApproval(
                        autoApproveInsights: request.AutoApprovalSettings.AutoApproveInsights,
                        minInsightScore: request.AutoApprovalSettings.MinInsightScore,
                        autoGeneratePosts: request.AutoApprovalSettings.AutoGeneratePosts,
                        autoSchedulePosts: request.AutoApprovalSettings.AutoSchedulePosts
                    );
                }

                // Update publishing schedule if provided
                if (request.PublishingSchedule != null)
                {
                    // Parse the preferred time string (e.g., "09:00") to TimeOnly
                    var preferredTime = TimeOnly.Parse(request.PublishingSchedule.PreferredTime);
                    
                    project.ConfigurePublishingSchedule(
                        preferredDays: request.PublishingSchedule.PreferredDays,
                        preferredTime: preferredTime,
                        timeZone: request.PublishingSchedule.TimeZone,
                        minimumInterval: request.PublishingSchedule.MinimumInterval
                    );
                }

                await _db.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Project {ProjectId} updated successfully", request.ProjectId);
                return Response.Success();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update project {ProjectId}", request.ProjectId);
                return Response.Failure("Failed to update project");
            }
        }
    }
}