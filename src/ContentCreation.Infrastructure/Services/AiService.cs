using ContentCreation.Core.Interfaces;
using ContentCreation.Core.DTOs;
using Google.GenerativeAI;
using Google.GenerativeAI.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ContentCreation.Infrastructure.Services;

public class AiService : IAIService
{
    private readonly ILogger<AiService> _logger;
    private readonly IConfiguration _configuration;
    private readonly GenerativeModel _model;

    public AiService(
        ILogger<AiService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        
        var apiKey = configuration["GOOGLE_AI_API_KEY"] 
            ?? throw new InvalidOperationException("GOOGLE_AI_API_KEY is not configured");
        
        var googleAi = new GoogleGenerativeAI(apiKey);
        _model = googleAi.GenerativeModel("gemini-pro");
    }

    public async Task<string> CleanTranscriptAsync(string rawTranscript)
    {
        _logger.LogInformation("Cleaning transcript with AI");
        
        var prompt = $@"
Clean and format the following transcript. Remove filler words, fix grammar, 
add proper punctuation, and organize into clear paragraphs. Maintain the original 
meaning and key points while making it more readable.

Transcript:
{rawTranscript}

Cleaned transcript:";

        var response = await _model.GenerateContentAsync(prompt);
        return response.Text ?? rawTranscript;
    }

    public async Task<string> GenerateTitleAsync(string content)
    {
        _logger.LogInformation("Generating title from content");
        
        var prompt = $@"
Generate a concise, descriptive title for the following content. 
The title should be 5-10 words and capture the main topic or theme.

Content:
{content}

Title:";

        var response = await _model.GenerateContentAsync(prompt);
        return response.Text?.Trim() ?? "Untitled Project";
    }

    public async Task<List<InsightResult>> ExtractInsightsAsync(string cleanedTranscript)
    {
        _logger.LogInformation("Extracting insights from transcript");
        
        var prompt = $@"
Extract 5 key insights from the following transcript. Each insight should be:
1. A standalone valuable point or idea
2. Actionable or thought-provoking
3. Suitable for social media posts

Transcript:
{cleanedTranscript}

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
            var insights = JsonSerializer.Deserialize<List<InsightResult>>(jsonResponse);
            return insights ?? new List<InsightResult>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse insights JSON");
            return new List<InsightResult>();
        }
    }

    public async Task<List<PostResult>> GeneratePostsAsync(string insight, List<string> platforms)
    {
        _logger.LogInformation("Generating posts for {Count} platforms", platforms.Count);
        
        var results = new List<PostResult>();
        
        foreach (var platform in platforms)
        {
            var platformGuidelines = GetPlatformGuidelines(platform);
            
            var prompt = $@"
Create a {platform} post based on this insight.

Insight:
{insight}

Platform guidelines:
{platformGuidelines}

Return the post in JSON format:
{{
  ""Platform"": ""{platform}"",
  ""Title"": ""Post title or first line"",
  ""Content"": ""The full post text"",
  ""CharacterCount"": 0
}}

Post:";

            var response = await _model.GenerateContentAsync(prompt);
            var jsonResponse = ExtractJson(response.Text ?? "{}");
            
            try
            {
                var post = JsonSerializer.Deserialize<PostResult>(jsonResponse);
                if (post != null)
                {
                    post.CharacterCount = post.Content.Length;
                    results.Add(post);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse post JSON for platform {Platform}", platform);
                results.Add(new PostResult 
                { 
                    Platform = platform,
                    Title = "Post",
                    Content = insight,
                    CharacterCount = insight.Length
                });
            }
        }
        
        return results;
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