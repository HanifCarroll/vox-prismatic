using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Core.DTOs.AI;
using ContentCreation.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using Polly;
using Polly.Retry;

namespace ContentCreation.Infrastructure.Services;

public class ContentProcessingService : IContentProcessingService
{
    private readonly ILogger<ContentProcessingService> _logger;
    private readonly IAIService _aiService;
    private readonly ITranscriptionService _transcriptionService;
    private readonly ApplicationDbContext _context;
    private readonly AsyncRetryPolicy _retryPolicy;
    
    // Cost estimates per 1000 tokens (rough approximation)
    private const decimal GEMINI_PRO_COST_PER_1K_TOKENS = 0.00025m;
    private const decimal DEEPGRAM_COST_PER_MINUTE = 0.0059m;
    private const int AVERAGE_TOKENS_PER_WORD = 2; // Conservative estimate

    public ContentProcessingService(
        ILogger<ContentProcessingService> logger,
        IAIService aiService,
        ITranscriptionService transcriptionService,
        ApplicationDbContext context)
    {
        _logger = logger;
        _aiService = aiService;
        _transcriptionService = transcriptionService;
        _context = context;
        
        // Configure retry policy with exponential backoff
        _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                3,
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning(
                        "Retry {RetryCount} after {TimeSpan}s due to: {Message}",
                        retryCount, timeSpan.TotalSeconds, exception.Message);
                });
    }

    // Original interface methods for compatibility
    public async Task ProcessTranscriptAsync(string projectId, string jobId)
    {
        _logger.LogInformation("Processing transcript for project {ProjectId}, job {JobId}", projectId, jobId);
        
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .FirstOrDefaultAsync(p => p.Id.ToString() == projectId);
            
        if (project?.Transcript == null)
        {
            throw new InvalidOperationException($"Project {projectId} or transcript not found");
        }
        
        // Clean the transcript using AI
        var cleanResult = await _retryPolicy.ExecuteAsync(async () =>
            await _aiService.CleanTranscriptAsync(new CleanTranscriptRequest { RawContent = project.Transcript.RawContent }));
        
        // Update the transcript
        project.Transcript.ProcessedContent = cleanResult.CleanedContent;
        project.Transcript.ProcessedAt = DateTime.UtcNow;
        
        // Generate title if not present
        if (string.IsNullOrEmpty(project.Title))
        {
            project.Title = await _retryPolicy.ExecuteAsync(async () =>
                await _aiService.GenerateTitleAsync(cleanResult.CleanedContent));
        }
        
        await _context.SaveChangesAsync();
        _logger.LogInformation("Transcript processing completed for project {ProjectId}", projectId);
    }

    public async Task ExtractInsightsAsync(string projectId, string jobId)
    {
        _logger.LogInformation("Extracting insights for project {ProjectId}, job {JobId}", projectId, jobId);
        
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .Include(p => p.Insights)
            .FirstOrDefaultAsync(p => p.Id.ToString() == projectId);
            
        if (project?.Transcript?.ProcessedContent == null)
        {
            throw new InvalidOperationException($"Project {projectId} has no processed transcript");
        }
        
        // Extract insights using AI
        var insightResults = await _retryPolicy.ExecuteAsync(async () =>
            await _aiService.ExtractInsightsAsync(new ExtractInsightsRequest
            {
                Content = project.Transcript.ProcessedContent,
                MaxInsights = project.WorkflowConfig?.InsightCount ?? 5
            }));
        
        // Save insights to database
        foreach (var result in insightResults.Insights)
        {
            var insight = new Insight
            {
                Id = Guid.NewGuid().ToString(),
                ProjectId = project.Id,
                Content = result.Content,
                Summary = result.Summary,
                Title = result.Title,
                Category = result.Category,
                PostType = result.PostType,
                UrgencyScore = result.UrgencyScore,
                RelatabilityScore = result.RelatabilityScore,
                SpecificityScore = result.SpecificityScore,
                AuthorityScore = result.AuthorityScore,
                TotalScore = result.UrgencyScore + result.RelatabilityScore + result.SpecificityScore + result.AuthorityScore,
                VerbatimQuote = result.VerbatimQuote,
                CreatedAt = DateTime.UtcNow
            };
            
            project.Insights.Add(insight);
        }
        
        await _context.SaveChangesAsync();
        _logger.LogInformation("Extracted {Count} insights for project {ProjectId}", 
            insightResults.Insights.Count, projectId);
    }

    public async Task GeneratePostsAsync(string projectId, string jobId, List<string> insightIds)
    {
        _logger.LogInformation("Generating posts for project {ProjectId}, insights: {Insights}", 
            projectId, string.Join(", ", insightIds));
        
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .ThenInclude(i => i.Posts)
            .FirstOrDefaultAsync(p => p.Id.ToString() == projectId);
            
        if (project == null)
        {
            throw new InvalidOperationException($"Project {projectId} not found");
        }
        
        var platforms = project.WorkflowConfig?.Platforms ?? new List<string> { "linkedin", "twitter" };
        var style = project.WorkflowConfig?.PostStyle ?? "professional";
        
        foreach (var insightId in insightIds)
        {
            var insight = project.Insights.FirstOrDefault(i => i.Id == insightId);
            if (insight == null) continue;
            
            foreach (var platform in platforms)
            {
                var postContent = await _retryPolicy.ExecuteAsync(async () =>
                    await _aiService.GeneratePostAsync(insight.Content, platform));
                
                var post = new Post
                {
                    Id = Guid.NewGuid().ToString(),
                    InsightId = insight.Id,
                    Platform = platform,
                    Content = postContent,
                    Status = "draft",
                    CreatedAt = DateTime.UtcNow
                };
                
                insight.Posts.Add(post);
            }
        }
        
        await _context.SaveChangesAsync();
        _logger.LogInformation("Generated posts for {Count} insights in project {ProjectId}", 
            insightIds.Count, projectId);
    }

    // Enhanced AI orchestration methods
    public async Task<ProcessingPipelineResult> ProcessContentPipelineAsync(
        Guid projectId, 
        string rawContent, 
        ProcessingOptions? options = null)
    {
        options ??= new ProcessingOptions();
        _logger.LogInformation("Starting content pipeline for project {ProjectId}", projectId);
        
        var result = new ProcessingPipelineResult { ProjectId = projectId };
        var costs = new ProcessingCostEstimate();
        
        try
        {
            // Step 1: Clean content if requested
            if (options.CleanContent)
            {
                var cleanResult = await _retryPolicy.ExecuteAsync(async () =>
                    await _aiService.CleanTranscriptAsync(new CleanTranscriptRequest { RawContent = rawContent }));
                result.CleanedContent = cleanResult.CleanedContent;
                costs.CleaningCost = EstimateTextProcessingCost(rawContent);
            }
            else
            {
                result.CleanedContent = rawContent;
            }
            
            // Step 2: Generate title if requested
            if (options.GenerateTitle)
            {
                result.GeneratedTitle = await _retryPolicy.ExecuteAsync(async () =>
                    await _aiService.GenerateTitleAsync(result.CleanedContent));
                costs.CleaningCost += EstimateTextProcessingCost(result.CleanedContent, 0.1m);
            }
            
            // Step 3: Extract insights
            result.Insights = await ExtractAndScoreInsightsAsync(
                result.CleanedContent, 
                options.InsightCount);
            costs.InsightExtractionCost = EstimateTextProcessingCost(result.CleanedContent, 0.5m);
            
            // Step 4: Generate posts for each insight
            result.PostsByInsight = new Dictionary<string, List<PostResult>>();
            foreach (var insight in result.Insights)
            {
                var posts = await GeneratePostsForInsightAsync(
                    insight, 
                    options.Platforms,
                    new PostGenerationOptions { Style = options.PostStyle });
                    
                result.PostsByInsight[insight.Title] = posts;
                costs.PostGenerationCost += EstimateTextProcessingCost(insight.Summary, 0.3m);
            }
            
            // Step 5: Analyze content metrics
            result.Metrics = await AnalyzeContentAsync(result.CleanedContent);
            
            // Calculate total cost
            if (options.TrackCosts)
            {
                costs.TotalCost = costs.CleaningCost + costs.InsightExtractionCost + costs.PostGenerationCost;
                result.TotalCost = costs.TotalCost;
                
                _logger.LogInformation("Processing cost for project {ProjectId}: ${Cost:F4}", 
                    projectId, costs.TotalCost);
            }
            
            result.ProcessedAt = DateTime.UtcNow;
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in content pipeline for project {ProjectId}", projectId);
            throw;
        }
    }

    public async Task<List<InsightResult>> ExtractAndScoreInsightsAsync(
        string cleanedContent, 
        int count = 5,
        InsightExtractionOptions? options = null)
    {
        options ??= new InsightExtractionOptions();
        
        var insightsResult = await _retryPolicy.ExecuteAsync(async () =>
            await _aiService.ExtractInsightsAsync(new ExtractInsightsRequest 
            { 
                Content = cleanedContent, 
                MaxInsights = count 
            }));
        
        var insights = insightsResult.Insights;
        
        // Filter insights based on options
        if (options.MinScore > 0)
        {
            insights = insights.Where(i => 
                (i.UrgencyScore + i.RelatabilityScore + i.SpecificityScore + i.AuthorityScore) / 4 >= options.MinScore)
                .ToList();
        }
        
        if (options.PreferredCategories.Any())
        {
            insights = insights.OrderByDescending(i => 
                options.PreferredCategories.Contains(i.Category)).ToList();
        }
        
        if (options.PreferredPostTypes.Any())
        {
            insights = insights.OrderByDescending(i => 
                options.PreferredPostTypes.Contains(i.PostType)).ToList();
        }
        
        if (!options.IncludeQuotes)
        {
            insights.ForEach(i => i.VerbatimQuote = string.Empty);
        }
        
        // Convert ExtractedInsight to InsightResult
        return insights.Select(i => new InsightResult
        {
            Title = i.Title,
            Summary = i.Summary,
            Quote = i.VerbatimQuote,
            Category = i.Category,
            PostType = i.PostType,
            Score = (i.UrgencyScore + i.RelatabilityScore + i.SpecificityScore + i.AuthorityScore) / 4.0,
            Metadata = i.Metadata ?? new Dictionary<string, object>()
        }).ToList();
    }

    public async Task<List<PostResult>> GeneratePostsForInsightAsync(
        InsightResult insight, 
        List<string> platforms,
        PostGenerationOptions? options = null)
    {
        options ??= new PostGenerationOptions();
        var posts = new List<PostResult>();
        
        foreach (var platform in platforms)
        {
            var retryCount = 0;
            PostResult? post = null;
            
            while (retryCount < options.MaxRetries && post == null)
            {
                try
                {
                    var content = await _aiService.GeneratePostAsync(
                        insight.Summary, 
                        platform);
                    
                    // Apply post-processing
                    if (!options.IncludeHashtags)
                    {
                        content = Regex.Replace(content, @"#\w+", "");
                    }
                    
                    if (!options.IncludeEmojis)
                    {
                        content = Regex.Replace(content, @"[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]", "", RegexOptions.IgnoreCase);
                    }
                    
                    if (options.MaxLength.HasValue && content.Length > options.MaxLength.Value)
                    {
                        content = content.Substring(0, options.MaxLength.Value - 3) + "...";
                    }
                    
                    post = new PostResult
                    {
                        Platform = platform,
                        Title = insight.Title,
                        Content = content,
                        CharacterCount = content.Length
                    };
                    
                    posts.Add(post);
                }
                catch (Exception ex)
                {
                    retryCount++;
                    _logger.LogWarning("Failed to generate {Platform} post, retry {Retry}: {Message}", 
                        platform, retryCount, ex.Message);
                    
                    if (retryCount >= options.MaxRetries)
                    {
                        // Add fallback post
                        posts.Add(new PostResult
                        {
                            Platform = platform,
                            Title = insight.Title,
                            Content = insight.Summary,
                            CharacterCount = insight.Summary.Length
                        });
                    }
                    else
                    {
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount)));
                    }
                }
            }
        }
        
        return posts;
    }

    public async Task<ContentMetrics> AnalyzeContentAsync(string content)
    {
        return await Task.Run(() =>
        {
            var metrics = new ContentMetrics
            {
                CharacterCount = content.Length,
                WordCount = content.Split(new[] { ' ', '\n', '\r', '\t' }, 
                    StringSplitOptions.RemoveEmptyEntries).Length,
                EstimatedReadingTime = content.Length / 1000 * 60 // Rough estimate: 1000 chars/minute
            };
            
            // Calculate word frequency
            var words = Regex.Matches(content.ToLower(), @"\b\w+\b")
                .Cast<Match>()
                .Select(m => m.Value)
                .Where(w => w.Length > 3); // Ignore short words
                
            metrics.WordFrequency = words
                .GroupBy(w => w)
                .OrderByDescending(g => g.Count())
                .Take(20)
                .ToDictionary(g => g.Key, g => g.Count());
            
            // Extract key topics (top frequent meaningful words)
            metrics.KeyTopics = metrics.WordFrequency
                .Keys
                .Take(5)
                .ToList();
            
            // Simple sentiment analysis (placeholder - could integrate a proper sentiment API)
            var positiveWords = new[] { "good", "great", "excellent", "amazing", "wonderful", "fantastic", "love", "happy" };
            var negativeWords = new[] { "bad", "terrible", "awful", "hate", "sad", "angry", "frustrated", "disappointed" };
            
            var lowerContent = content.ToLower();
            var positiveCount = positiveWords.Count(w => lowerContent.Contains(w));
            var negativeCount = negativeWords.Count(w => lowerContent.Contains(w));
            
            if (positiveCount + negativeCount > 0)
            {
                metrics.SentimentScore = (double)(positiveCount - negativeCount) / (positiveCount + negativeCount);
            }
            
            return metrics;
        });
    }

    public async Task<ProcessingCostEstimate> EstimateProcessingCostAsync(
        string content, 
        ProcessingOptions options)
    {
        return await Task.Run(() =>
        {
            var estimate = new ProcessingCostEstimate();
            var wordCount = content.Split(new[] { ' ', '\n', '\r', '\t' }, 
                StringSplitOptions.RemoveEmptyEntries).Length;
            var estimatedTokens = wordCount * AVERAGE_TOKENS_PER_WORD;
            
            estimate.EstimatedTokens = estimatedTokens;
            
            // Estimate costs based on operations
            if (options.CleanContent)
            {
                estimate.CleaningCost = EstimateTextProcessingCost(content);
            }
            
            if (options.GenerateTitle)
            {
                estimate.CleaningCost += EstimateTextProcessingCost(content, 0.1m);
            }
            
            estimate.InsightExtractionCost = EstimateTextProcessingCost(content, 0.5m) * options.InsightCount;
            
            estimate.PostGenerationCost = EstimateTextProcessingCost(content, 0.2m) * 
                options.InsightCount * options.Platforms.Count;
            
            estimate.TotalCost = estimate.TranscriptionCost + estimate.CleaningCost + 
                estimate.InsightExtractionCost + estimate.PostGenerationCost;
            
            return estimate;
        });
    }

    private decimal EstimateTextProcessingCost(string text, decimal multiplier = 1.0m)
    {
        var wordCount = text.Split(new[] { ' ', '\n', '\r', '\t' }, 
            StringSplitOptions.RemoveEmptyEntries).Length;
        var estimatedTokens = wordCount * AVERAGE_TOKENS_PER_WORD;
        return (estimatedTokens / 1000m) * GEMINI_PRO_COST_PER_1K_TOKENS * multiplier;
    }
}