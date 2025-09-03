using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Mscc.GenerativeAI;
using System.Text.Json;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class PostGenerationJob
{
    private readonly ILogger<PostGenerationJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly GenerativeModel _aiModel;

    public PostGenerationJob(
        ILogger<PostGenerationJob> logger,
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _configuration = configuration;
        
        // Initialize AI model directly
        var apiKey = configuration["GOOGLE_AI_API_KEY"] 
            ?? throw new InvalidOperationException("GOOGLE_AI_API_KEY is not configured");
        
        var googleAi = new GoogleAI(apiKey);
        _aiModel = googleAi.GenerativeModel(Model.Gemini15Pro);
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task GeneratePosts(Guid projectId)
    {
        _logger.LogInformation("Starting post generation for project {ProjectId}", projectId);
        
        try
        {
            // Get the project with approved insights
            var project = await _context.ContentProjects
                .Include(p => p.Insights)
                .Include(p => p.Posts)
                .FirstOrDefaultAsync(p => p.Id == projectId);
                
            if (project == null)
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return;
            }
            
            var approvedInsights = project.Insights.Where(i => i.IsApproved).ToList();
            if (!approvedInsights.Any())
            {
                _logger.LogWarning("No approved insights for project {ProjectId}", projectId);
                return;
            }
            
            // Generate posts for each approved insight
            int postCount = 0;
            foreach (var insight in approvedInsights)
            {
                try
                {
                    var postData = await GeneratePostWithAI(insight);
                    
                    if (postData != null)
                    {
                        var post = Post.Create(
                            projectId: projectId,
                            insightId: insight.Id,
                            title: postData.Title,
                            platform: SocialPlatform.LinkedIn,
                            content: postData.Content,
                            hashtags: postData.Hashtags
                        );
                        
                        _context.Posts.Add(post);
                        postCount++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error generating post for insight {InsightId}", insight.Id);
                }
            }
            
            if (postCount > 0)
            {
                // Update project stage
                project.StartGeneratingPosts();
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Generated {Count} posts for project {ProjectId}", postCount, projectId);
                
                // Log event
                await LogProjectEvent(projectId.ToString(), "posts_generated", $"Generated {postCount} posts");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating posts for project {ProjectId}", projectId);
            throw;
        }
    }

    [Queue("low")]
    [AutomaticRetry(Attempts = 1)]
    public async Task GeneratePostsFromInsights()
    {
        var projectsToProcess = await _context.ContentProjects
            .Where(p => p.CurrentStage == ProjectStage.InsightsApproved)
            .Select(p => p.Id)
            .ToListAsync();
            
        foreach (var projectId in projectsToProcess)
        {
            BackgroundJob.Enqueue(() => GeneratePosts(projectId));
        }
    }

    private async Task<PostData?> GeneratePostWithAI(Insight insight)
    {
        var prompt = $@"
        Create a LinkedIn post based on the following insight.
        
        Insight Title: {insight.Title}
        Insight Content: {insight.Content}
        Category: {insight.Category}
        Quote: {insight.VerbatimQuote}
        
        Requirements:
        1. Make it engaging and professional
        2. Keep it under 3000 characters
        3. Include relevant hashtags (3-5)
        4. Start with a hook that grabs attention
        5. End with a call to action or thought-provoking question
        
        Return as JSON with:
        - Title: A compelling headline
        - Content: The full post content including hashtags
        - Metadata: Any additional metadata as key-value pairs";

        try
        {
            var response = await _aiModel.GenerateContent(prompt);
            
            if (response?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text is string jsonResponse)
            {
                // Extract JSON from the response
                var startIndex = jsonResponse.IndexOf('{');
                var endIndex = jsonResponse.LastIndexOf('}');
                if (startIndex >= 0 && endIndex >= 0)
                {
                    var json = jsonResponse.Substring(startIndex, endIndex - startIndex + 1);
                    return JsonSerializer.Deserialize<PostData>(json);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating post with AI");
        }
        
        return null;
    }

    private async Task LogProjectEvent(string projectId, string eventType, string description)
    {
        try
        {
            var activity = new ProjectActivity
            {
                Id = Guid.NewGuid(),
                ProjectId = Guid.Parse(projectId),
                ActivityType = eventType,
                ActivityName = eventType,
                Description = description,
                Metadata = null,
                OccurredAt = DateTime.UtcNow,
                UserId = null
            };
            
            _context.ProjectActivities.Add(activity);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log project event");
        }
    }

    private class PostData
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? Hashtags { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }
}