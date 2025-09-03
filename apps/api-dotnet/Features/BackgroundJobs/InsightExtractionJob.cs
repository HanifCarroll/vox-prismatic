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

public class InsightExtractionJob
{
    private readonly ILogger<InsightExtractionJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly GenerativeModel _aiModel;

    public InsightExtractionJob(
        ILogger<InsightExtractionJob> logger,
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
    public async Task ExtractInsights(Guid projectId)
    {
        _logger.LogInformation("Starting insight extraction for project {ProjectId}", projectId);
        
        try
        {
            // Get the project with transcript
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .Include(p => p.Insights)
                .FirstOrDefaultAsync(p => p.Id == projectId);
                
            if (project == null)
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return;
            }
            
            if (project.Transcript == null || string.IsNullOrEmpty(project.Transcript.ProcessedContent))
            {
                _logger.LogWarning("No processed transcript for project {ProjectId}", projectId);
                return;
            }
            
            // Extract insights with AI directly
            _logger.LogInformation("Extracting insights with AI");
            var maxInsights = 5; // Default to 5 insights
            var insights = await ExtractInsightsWithAI(project.Transcript.ProcessedContent, maxInsights);
            
            // Save insights
            int insightCount = 0;
            foreach (var insightData in insights)
            {
                var insight = Insight.Create(
                    projectId: projectId,
                    transcriptId: project.Transcript.Id,
                    title: insightData.Title ?? "Insight",
                    summary: insightData.Summary ?? insightData.Content,
                    content: insightData.Content,
                    verbatimQuote: insightData.VerbatimQuote,
                    category: insightData.Category ?? "general",
                    postType: insightData.PostType ?? "insight",
                    tags: insightData.Tags != null ? string.Join(",", insightData.Tags) : null,
                    urgencyScore: insightData.UrgencyScore,
                    relatabilityScore: insightData.RelatabilityScore,
                    specificityScore: insightData.SpecificityScore,
                    authorityScore: insightData.AuthorityScore
                );
                
                _context.Insights.Add(insight);
                insightCount++;
            }
            
            // Update project stage
            project.TransitionTo(ProjectStage.InsightsReady);
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Extracted {Count} insights for project {ProjectId}", insightCount, projectId);
            
            // Log event
            await LogProjectEvent(projectId.ToString(), "insights_extracted", $"Extracted {insightCount} insights");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting insights for project {ProjectId}", projectId);
            throw;
        }
    }

    [Queue("low")]
    [AutomaticRetry(Attempts = 1)]
    public async Task ExtractInsightsFromTranscripts()
    {
        var projectsToProcess = await _context.ContentProjects
            .Where(p => p.CurrentStage == ProjectStage.ProcessingContent && p.Transcript != null)
            .Select(p => p.Id)
            .ToListAsync();
            
        foreach (var projectId in projectsToProcess)
        {
            BackgroundJob.Enqueue(() => ExtractInsights(projectId));
        }
    }

    private async Task<List<InsightData>> ExtractInsightsWithAI(string content, int maxInsights)
    {
        var prompt = $@"
        Extract {maxInsights} key insights from the following content.
        
        Content:
        {content}
        
        For each insight, provide:
        1. Title (brief, compelling headline)
        2. Summary (2-3 sentences)
        3. Content (full insight, 100-200 words)
        4. VerbatimQuote (exact quote from the content that supports this insight)
        5. Category (leadership, productivity, innovation, strategy, culture, or general)
        6. PostType (insight, tip, story, question, or announcement)
        7. Tags (3-5 relevant tags)
        8. UrgencyScore (1-10, how time-sensitive is this?)
        9. RelatabilityScore (1-10, how relatable is this to a broad audience?)
        10. SpecificityScore (1-10, how specific and actionable is this?)
        11. AuthorityScore (1-10, how authoritative is the insight?)
        
        Return as JSON array.";

        try
        {
            var response = await _aiModel.GenerateContent(prompt);
            
            if (response?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text is string jsonResponse)
            {
                // Extract JSON from the response
                var startIndex = jsonResponse.IndexOf('[');
                var endIndex = jsonResponse.LastIndexOf(']');
                if (startIndex >= 0 && endIndex >= 0)
                {
                    var jsonArray = jsonResponse.Substring(startIndex, endIndex - startIndex + 1);
                    return JsonSerializer.Deserialize<List<InsightData>>(jsonArray) ?? new List<InsightData>();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting insights with AI");
        }
        
        return new List<InsightData>();
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

    private class InsightData
    {
        public string Title { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string VerbatimQuote { get; set; } = string.Empty;
        public string Category { get; set; } = "general";
        public string PostType { get; set; } = "insight";
        public List<string>? Tags { get; set; }
        public int UrgencyScore { get; set; } = 5;
        public int RelatabilityScore { get; set; } = 5;
        public int SpecificityScore { get; set; } = 5;
        public int AuthorityScore { get; set; } = 5;
    }
}