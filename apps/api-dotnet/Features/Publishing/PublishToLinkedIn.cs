using MediatR;
using ContentCreation.Api.Infrastructure.Data;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RestSharp;
using System.Text.Json;
using System.Net;

namespace ContentCreation.Api.Features.Publishing;

public static class PublishToLinkedIn
{
    public record Request(
        Guid ProjectId,
        Guid PostId,
        Guid UserId,
        bool PublishNow = false
    ) : IRequest<Response>;

    public record Response(bool IsSuccess, string? Error, string? PublishedUrl)
    {
        public static Response Success(string publishedUrl) => new(true, null, publishedUrl);
        public static Response NotFound(string error) => new(false, error, null);
        public static Response BadRequest(string error) => new(false, error, null);
    }

    public class Handler : IRequestHandler<Request, Response>
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<Handler> _logger;
        private readonly IConfiguration _configuration;
        private readonly RestClient _linkedInClient;
        private string? _accessToken;

        public Handler(
            ApplicationDbContext db,
            ILogger<Handler> logger,
            IConfiguration configuration)
        {
            _db = db;
            _logger = logger;
            _configuration = configuration;
            _linkedInClient = new RestClient("https://api.linkedin.com/v2/");
            _accessToken = configuration["ApiKeys:LinkedIn:AccessToken"] ?? configuration["LINKEDIN_ACCESS_TOKEN"];
        }

        public async Task<Response> Handle(Request request, CancellationToken cancellationToken)
        {
            var project = await _db.ContentProjects
                .Include(p => p.Posts)
                .Include(p => p.ScheduledPosts)
                .FirstOrDefaultAsync(p => 
                    p.Id == request.ProjectId && 
                    p.UserId == request.UserId, cancellationToken);

            if (project == null)
                return Response.NotFound("Project not found");

            var post = project.Posts?.FirstOrDefault(p => p.Id == request.PostId);
            if (post == null)
                return Response.NotFound("Post not found");

            if (!post.IsApproved && post.Status != PostStatus.Scheduled)
                return Response.BadRequest($"Cannot publish post that is not approved or scheduled");

            try
            {
                // Get or create scheduled post entry
                var scheduledPost = await _db.Set<ScheduledPost>()
                    .FirstOrDefaultAsync(sp => sp.PostId == request.PostId && sp.ProjectId == request.ProjectId, cancellationToken);

                if (scheduledPost == null)
                {
                    scheduledPost = ScheduledPost.Create(
                        projectId: project.Id,
                        postId: request.PostId,
                        platform: "LinkedIn",
                        content: post.Content,
                        scheduledFor: request.PublishNow ? DateTime.UtcNow.AddSeconds(1) : DateTime.UtcNow.AddMinutes(5),
                        timeZone: "UTC"
                    );
                    scheduledPost.StartProcessing();
                    _db.ScheduledPosts.Add(scheduledPost);
                }
                else
                {
                    scheduledPost.StartProcessing();
                }

                await _db.SaveChangesAsync(cancellationToken);

                // Publish to LinkedIn directly
                string? publishedId = null;
                string? error = null;
                
                try
                {
                    publishedId = await PublishToLinkedIn(post.Content);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to publish to LinkedIn");
                    error = ex.Message;
                }
                
                var isSuccess = publishedId != null;
                var publishedUrl = isSuccess ? $"https://linkedin.com/posts/{publishedId}" : null;

                if (isSuccess)
                {
                    scheduledPost.MarkAsPublished(publishedUrl ?? string.Empty, publishedId);
                    
                    // Use domain method to mark post as published
                    post.MarkAsPublished();

                    // Use domain methods to update project state
                    if (project.CurrentStage == ProjectStage.Scheduled || project.CurrentStage == ProjectStage.PostsApproved)
                    {
                        project.StartPublishing();
                    }
                    
                    // Check if all posts are published and complete publishing
                    var allPublished = project.Posts?.All(p => p.Status == PostStatus.Published) ?? false;
                    if (allPublished && project.CurrentStage == ProjectStage.Publishing)
                    {
                        project.CompletePublishing();
                    }
                }
                else
                {
                    scheduledPost.MarkAsFailed(error ?? "Failed to publish", error);
                    
                    // Use domain method to mark post as failed
                    post.MarkAsFailed(error ?? "Failed to publish to LinkedIn");
                    
                    // If in publishing state and this causes all posts to fail, handle it
                    var anySuccessful = project.Posts?.Any(p => p.Status == PostStatus.Published) ?? false;
                    if (project.CurrentStage == ProjectStage.Publishing && !anySuccessful)
                    {
                        project.FailPublishing(error ?? "Failed to publish");
                    }
                }

                await _db.SaveChangesAsync(cancellationToken);

                if (isSuccess)
                {
                    _logger.LogInformation("Published post {PostId} to LinkedIn with URL {Url}", 
                        request.PostId, publishedUrl);
                    return Response.Success(publishedUrl ?? string.Empty);
                }
                else
                {
                    _logger.LogError("Failed to publish post {PostId}: {Error}", 
                        request.PostId, error);
                    return Response.BadRequest(error ?? "Failed to publish");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish post {PostId} to LinkedIn", request.PostId);
                return Response.BadRequest($"Failed to publish: {ex.Message}");
            }
        }
        
        private async Task<string?> PublishToLinkedIn(string content)
        {
            if (string.IsNullOrEmpty(_accessToken))
            {
                throw new InvalidOperationException("LinkedIn access token is not configured");
            }
            
            _logger.LogInformation("Publishing post to LinkedIn with {CharCount} characters", content.Length);
            
            if (content.Length > 3000)
            {
                _logger.LogWarning("LinkedIn post content exceeds 3000 character limit, truncating");
                content = content.Substring(0, 2997) + "...";
            }
            
            // Get author URN
            var authorUrn = await GetAuthorUrn();
            
            // Create post request
            var request = new RestRequest("ugcPosts", Method.Post);
            request.AddHeader("Authorization", $"Bearer {_accessToken}");
            request.AddHeader("Content-Type", "application/json");
            request.AddHeader("X-Restli-Protocol-Version", "2.0.0");
            
            var body = new
            {
                author = authorUrn,
                lifecycleState = "PUBLISHED",
                specificContent = new
                {
                    shareCommentary = new
                    {
                        text = content
                    },
                    shareMediaCategory = "NONE"
                },
                visibility = new
                {
                    memberNetworkVisibility = "PUBLIC"
                }
            };
            
            request.AddJsonBody(body);
            
            var response = await _linkedInClient.ExecuteAsync(request);
            
            if (!response.IsSuccessful)
            {
                _logger.LogError("LinkedIn post failed with status {Status}: {Error}", response.StatusCode, response.Content);
                
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    throw new Exception("LinkedIn rate limit exceeded. Please try again later.");
                }
                else if (response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    throw new Exception("LinkedIn authentication failed. Please re-authenticate.");
                }
                
                throw new Exception($"LinkedIn post failed: {response.Content}");
            }
            
            var postId = response.Headers?.FirstOrDefault(h => h.Name == "X-RestLi-Id")?.Value?.ToString();
            
            _logger.LogInformation("Successfully published to LinkedIn with ID: {PostId}", postId);
            return postId;
        }
        
        private async Task<string> GetAuthorUrn()
        {
            var request = new RestRequest("me", Method.Get);
            request.AddHeader("Authorization", $"Bearer {_accessToken}");
            
            var response = await _linkedInClient.ExecuteAsync(request);
            
            if (!response.IsSuccessful)
            {
                throw new Exception($"Failed to get LinkedIn profile: {response.Content}");
            }
            
            var profile = JsonSerializer.Deserialize<LinkedInProfile>(response.Content!, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            
            return $"urn:li:person:{profile?.Id}";
        }
    }
    
    // Internal class for LinkedIn API response
    internal class LinkedInProfile
    {
        public string Id { get; set; } = string.Empty;
    }
}