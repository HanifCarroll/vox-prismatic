using ContentCreation.Core.Interfaces;
using ContentCreation.Core.DTOs.AI;
using Google.GenerativeAI;
using Google.GenerativeAI.Models;
using ContentCreation.Core.DTOs;
using Mscc.GenerativeAI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class AIService : IAIService
{
    private readonly ILogger<AIService> _logger;
    private readonly IConfiguration _configuration;
    private readonly GenerativeModel _model;

    public AIService(
        ILogger<AIService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        
        var apiKey = configuration["GOOGLE_AI_API_KEY"] 
            ?? throw new InvalidOperationException("GOOGLE_AI_API_KEY is not configured");
        
        var googleAi = new GoogleAI(apiKey);
        _model = googleAi.GenerativeModel(Model.Gemini15Pro);
    }

    public async Task<CleanTranscriptResult> CleanTranscriptAsync(CleanTranscriptRequest request)
    {
        _logger.LogInformation("Cleaning transcript with AI");
        
        var prompt = $@"
Clean and format the following transcript. Remove filler words, fix grammar, 
add proper punctuation, and organize into clear paragraphs. Maintain the original 
meaning and key points while making it more readable.

Transcript:
{request.RawContent}

Cleaned transcript:";

        var response = await _model.GenerateContentAsync(prompt);
        var cleanedContent = response.Text ?? request.RawContent;
        
        return new CleanTranscriptResult
        {
            CleanedContent = cleanedContent,
            WordCount = cleanedContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length,
            RemovedSections = new List<string>(),
            Metadata = new Dictionary<string, object>
            {
                ["sourceType"] = request.SourceType ?? "unknown",
                ["model"] = "gemini-pro"
            }
        };
    }

    public async Task<ExtractInsightsResult> ExtractInsightsAsync(ExtractInsightsRequest request)
    {
        _logger.LogInformation("Extracting {Count} insights from content", request.MaxInsights);
        
        var prompt = $@"
Extract {request.MaxInsights} key insights from the following content. Each insight should be:
1. A standalone valuable point or idea
2. Actionable or thought-provoking
3. Suitable for social media posts

Content:
{request.Content}

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

        var response = await _model.GenerateContentAsync(prompt);
        var jsonResponse = ExtractJson(response.Text ?? "[]");
        
        try
        {
            var rawInsights = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(jsonResponse) ?? new List<Dictionary<string, object>>();
            var insights = new List<ExtractedInsight>();
            
            foreach (var raw in rawInsights)
            {
                insights.Add(new ExtractedInsight
                {
                    Title = raw.GetValueOrDefault("Title")?.ToString() ?? "Untitled",
                    Content = raw.GetValueOrDefault("Summary")?.ToString() ?? "",
                    Category = raw.GetValueOrDefault("Category")?.ToString() ?? "General",
                    Tags = request.Topics ?? new List<string>(),
                    ConfidenceScore = Convert.ToDouble(raw.GetValueOrDefault("AuthorityScore", 5)) / 10.0,
                    Metadata = raw
                });
            }
            
            return new ExtractInsightsResult
            {
                Insights = insights,
                TotalExtracted = insights.Count,
                Metadata = new Dictionary<string, object>
                {
                    ["model"] = "gemini-pro",
                    ["requestedCount"] = request.MaxInsights
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse insights JSON");
            return new ExtractInsightsResult
            {
                Insights = new List<ExtractedInsight>(),
                TotalExtracted = 0,
                Metadata = new Dictionary<string, object> { ["error"] = ex.Message }
            };
        }
    }

    public async Task<GeneratePostsResult> GeneratePostsAsync(GeneratePostsRequest request)
    {
        _logger.LogInformation("Generating posts for {Count} platforms from {InsightCount} insights", 
            request.Platforms.Count, request.Insights.Count);
        
        var posts = new List<GeneratedPost>();
        
        foreach (var platform in request.Platforms)
        {
            foreach (var insight in request.Insights.Take(2)) // Generate up to 2 posts per platform
            {
                var platformGuidelines = GetPlatformGuidelines(platform);
                
                var prompt = $@"
Create a {platform} post based on this insight.

Insight Title: {insight.Title}
Insight Content: {insight.Content}

Platform guidelines:
{platformGuidelines}

Return the post in JSON format:
{{
  ""Platform"": ""{platform}"",
  ""Title"": ""Post title or first line"",
  ""Content"": ""The full post text"",
  ""Hashtags"": [""tag1"", ""tag2""]
}}

Post:";

                var response = await _model.GenerateContentAsync(prompt);
                var jsonResponse = ExtractJson(response.Text ?? "{}");
                
                try
                {
                    var postData = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonResponse);
                    if (postData != null)
                    {
                        var post = new GeneratedPost
                        {
                            Platform = platform,
                            Title = postData.GetValueOrDefault("Title")?.ToString() ?? insight.Title,
                            Content = postData.GetValueOrDefault("Content")?.ToString() ?? insight.Content,
                            Hashtags = ParseHashtags(postData.GetValueOrDefault("Hashtags")),
                            Metadata = new Dictionary<string, object>
                            {
                                ["sourceInsight"] = insight.Title,
                                ["generatedAt"] = DateTime.UtcNow
                            }
                        };
                        posts.Add(post);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse post JSON for platform {Platform}", platform);
                    posts.Add(new GeneratedPost 
                    { 
                        Platform = platform,
                        Title = insight.Title,
                        Content = insight.Content,
                        Hashtags = new List<string>(),
                        Metadata = new Dictionary<string, object> { ["error"] = ex.Message }
                    });
                }
            }
        }
        
        return new GeneratePostsResult
        {
            Posts = posts,
            TotalGenerated = posts.Count,
            Metadata = new Dictionary<string, object>
            {
                ["model"] = "gemini-pro",
                ["averageLength"] = posts.Any() ? posts.Average(p => p.Content.Length) : 0
            }
        };
    }

    public async Task<string> GenerateSummaryAsync(string content, int maxLength = 500)
    {
        _logger.LogInformation("Generating summary with max length {MaxLength}", maxLength);
        
        var prompt = $@"
Create a concise summary of the following content in {maxLength} characters or less.
Focus on the key points and main message.

Content:
{content}

Summary:";

        var response = await _model.GenerateContentAsync(prompt);
        var summary = response.Text?.Trim() ?? content;
        
        if (summary.Length > maxLength)
            summary = summary.Substring(0, maxLength - 3) + "...";
            
        return summary;
    }

    public async Task<List<string>> GenerateHashtagsAsync(string content, string platform, int maxCount = 10)
    {
        _logger.LogInformation("Generating hashtags for {Platform}", platform);
        
        var prompt = $@"
Generate {maxCount} relevant hashtags for the following content on {platform}.
Return only the hashtags as a comma-separated list without the # symbol.

Content:
{content}

Hashtags:";

        var response = await _model.GenerateContentAsync(prompt);
        var hashtagsText = response.Text?.Trim() ?? "";
        
        return hashtagsText.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(h => h.Trim())
            .Take(maxCount)
            .ToList();
    }
    
    public async Task<double> CalculateContentScoreAsync(string content)
    {
        _logger.LogInformation("Calculating content score");
        
        var prompt = $@"
Rate the quality of this content on a scale from 0 to 1 (with 1 decimal place).
Consider clarity, value, engagement potential, and coherence.
Return only the numeric score.

Content:
{content}

Score:";

        var response = await _model.GenerateContentAsync(prompt);
        
        if (double.TryParse(response.Text?.Trim(), out var score))
            return Math.Min(1.0, Math.Max(0.0, score));
            
        return 0.5; // Default score if parsing fails
    }

    private string GetPlatformGuidelines(string platform)
    {
        return platform.ToLower() switch
        {
            "linkedin" => "Professional tone, 1300 character limit, focus on value and insights, use 3-5 relevant hashtags",
            "twitter" or "x" => "Concise and engaging, 280 character limit, use 1-2 hashtags, conversational tone",
            _ => "Clear and engaging content suitable for social media"
        };
    }

    private List<string> ParseHashtags(object? hashtagsObj)
    {
        if (hashtagsObj == null) return new List<string>();
        
        if (hashtagsObj is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
        {
            return jsonElement.EnumerateArray()
                .Select(e => e.GetString() ?? "")
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
        }
        
        return new List<string>();
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