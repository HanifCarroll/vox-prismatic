using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Infrastructure.Data;
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
        
        var job = await CreateProcessingJob(projectId, ProcessingJobType.ExtractInsights);
        
        try
        {
            // Get the project with transcript
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .Include(p => p.Insights)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            if (project.Transcript == null || string.IsNullOrEmpty(project.Transcript.ProcessedContent))
            {
                throw new Exception($"Project {projectId} has no processed transcript");
            }
            
            // Update job status
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 10);
            
            // Extract insights with AI directly
            _logger.LogInformation("Extracting insights with AI");
            var maxInsights = project.WorkflowConfig?.InsightCount ?? 5;
            var insights = await ExtractInsightsWithAI(project.Transcript.ProcessedContent, maxInsights);
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 60);
            
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
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 80);
            
            // Update project stage
            project.TransitionTo(ProjectStage.InsightsReady);
            
            // Update metrics
            project.Metrics.InsightCount = insightCount;
            project.Metrics.LastInsightExtractionAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Complete job
            await CompleteJob(job, insightCount);
            
            _logger.LogInformation("Extracted {Count} insights for project {ProjectId}", insightCount, projectId);
            
            // Log event
            await LogProjectEvent(projectId.ToString(), "insights_extracted", $"Extracted {insightCount} insights");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting insights for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(Guid projectId, ProcessingJobType jobType)
    {
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = jobType,
            Status = ProcessingJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        return job;
    }

    private async Task UpdateJobStatus(ProjectProcessingJob job, ProcessingJobStatus status, int progress)
    {
        job.Status = status;
        job.Progress = progress;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (status == ProcessingJobStatus.Processing && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CompleteJob(ProjectProcessingJob job, int resultCount)
    {
        job.Status = ProcessingJobStatus.Completed;
        job.Progress = 100;
        job.ResultCount = resultCount;
        job.CompletedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (job.StartedAt.HasValue)
        {
            job.DurationMs = (int)(job.CompletedAt.Value - job.StartedAt.Value).TotalMilliseconds;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task FailJob(ProjectProcessingJob job, string errorMessage)
    {
        job.Status = ProcessingJobStatus.Failed;
        job.ErrorMessage = errorMessage;
        job.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
    }

    private async Task LogProjectEvent(string projectId, string eventType, string description)
    {
        var projectActivity = new ProjectActivity
        {
            ProjectId = Guid.Parse(projectId),
            ActivityType = eventType,
            ActivityName = description,
            Description = description,
            OccurredAt = DateTime.UtcNow
        };
        
        _context.ProjectActivities.Add(projectActivity);
        await _context.SaveChangesAsync();
    }
    
    // Method for RecurringJobService compatibility
    public async Task ExtractInsightsFromTranscripts()
    {
        _logger.LogInformation("Starting batch insight extraction from transcripts");
        
        // Find projects that need insight extraction
        var projects = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Where(p => p.CurrentStage == ProjectStage.ProcessingContent 
                && p.Transcript != null 
                && !string.IsNullOrEmpty(p.Transcript.ProcessedContent)
                && !p.Insights.Any())
            .Take(5) // Process 5 at a time
            .ToListAsync();
        
        foreach (var project in projects)
        {
            try
            {
                await ExtractInsights(project.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to extract insights for project {ProjectId}", project.Id);
            }
        }
        
        _logger.LogInformation("Completed batch insight extraction for {Count} projects", projects.Count);
    }
    
    private async Task<List<ExtractedInsight>> ExtractInsightsWithAI(string content, int maxInsights)
    {
        var prompt = $@"
Extract {maxInsights} key insights from the following content. Each insight should be:
1. A standalone valuable point or idea
2. Actionable or thought-provoking
3. Suitable for social media posts

Content:
{content}

Return the insights in JSON format:
[{{
  ""Title"": ""Short title for the insight"",
  ""Summary"": ""2-3 sentence summary"",
  ""VerbatimQuote"": ""Exact quote from transcript if applicable"",
  ""Category"": ""business|technology|personal|other"",
  ""PostType"": ""tip|quote|statistic|story|question"",
  ""UrgencyScore"": 1-10,
  ""RelatabilityScore"": 1-10,
  ""SpecificityScore"": 1-10,
  ""AuthorityScore"": 1-10
}}]

Insights:";

        try
        {
            var response = await _aiModel.GenerateContent(prompt);
            var jsonResponse = ExtractJson(response.Text ?? "[]");
            
            var rawInsights = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(jsonResponse) ?? new List<Dictionary<string, object>>();
            var insights = new List<ExtractedInsight>();
            
            foreach (var raw in rawInsights)
            {
                insights.Add(new ExtractedInsight
                {
                    Title = raw.GetValueOrDefault("Title")?.ToString() ?? "Untitled",
                    Content = raw.GetValueOrDefault("Summary")?.ToString() ?? "",
                    VerbatimQuote = raw.GetValueOrDefault("VerbatimQuote")?.ToString(),
                    Category = raw.GetValueOrDefault("Category")?.ToString() ?? "General",
                    PostType = raw.GetValueOrDefault("PostType")?.ToString() ?? "insight",
                    Tags = new List<string>(),
                    UrgencyScore = Convert.ToInt32(raw.GetValueOrDefault("UrgencyScore", 5)),
                    RelatabilityScore = Convert.ToInt32(raw.GetValueOrDefault("RelatabilityScore", 5)),
                    SpecificityScore = Convert.ToInt32(raw.GetValueOrDefault("SpecificityScore", 5)),
                    AuthorityScore = Convert.ToInt32(raw.GetValueOrDefault("AuthorityScore", 5)),
                    Summary = raw.GetValueOrDefault("Summary")?.ToString()
                });
            }
            
            return insights;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract insights with AI");
            return new List<ExtractedInsight>();
        }
    }
    
    private string ExtractJson(string text)
    {
        // Extract JSON from the response
        var startIndex = text.IndexOf('[');
        if (startIndex == -1) startIndex = text.IndexOf('{');
        if (startIndex == -1) return "[]";
        
        var endIndex = text.LastIndexOf(']');
        if (endIndex == -1) endIndex = text.LastIndexOf('}');
        if (endIndex == -1) return "[]";
        
        return text.Substring(startIndex, endIndex - startIndex + 1);
    }
}

// Local model for extracted insights
internal class ExtractedInsight
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? VerbatimQuote { get; set; }
    public string Category { get; set; } = "General";
    public string PostType { get; set; } = "insight";
    public List<string> Tags { get; set; } = new();
    public int UrgencyScore { get; set; }
    public int RelatabilityScore { get; set; }
    public int SpecificityScore { get; set; }
    public int AuthorityScore { get; set; }
}