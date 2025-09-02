using ContentCreation.Core.Entities;

namespace ContentCreation.Core.Interfaces;

public interface IContentProcessingService
{
    // Original methods for compatibility
    Task ProcessTranscriptAsync(string projectId, string jobId);
    Task ExtractInsightsAsync(string projectId, string jobId);
    Task GeneratePostsAsync(string projectId, string jobId, List<string> insightIds);
    
    // Enhanced methods for AI orchestration
    Task<ProcessingPipelineResult> ProcessContentPipelineAsync(
        Guid projectId, 
        string rawContent, 
        ProcessingOptions? options = null);
    
    Task<List<InsightResult>> ExtractAndScoreInsightsAsync(
        string cleanedContent, 
        int count = 5,
        InsightExtractionOptions? options = null);
    
    Task<List<PostResult>> GeneratePostsForInsightAsync(
        InsightResult insight, 
        List<string> platforms,
        PostGenerationOptions? options = null);
    
    Task<ContentMetrics> AnalyzeContentAsync(string content);
    
    Task<ProcessingCostEstimate> EstimateProcessingCostAsync(
        string content, 
        ProcessingOptions options);
}

public interface ISocialPostPublisher
{
    Task PublishPostAsync(string projectId, string postId);
    Task PublishToLinkedInAsync(string postId);
}

// Supporting classes for enhanced content processing
public class InsightResult
{
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Quote { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public double Score { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class PostResult
{
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = new();
    public List<string> MediaUrls { get; set; } = new();
    public int CharacterCount { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class ProcessingPipelineResult
{
    public Guid ProjectId { get; set; }
    public string CleanedContent { get; set; } = string.Empty;
    public string GeneratedTitle { get; set; } = string.Empty;
    public List<InsightResult> Insights { get; set; } = new();
    public Dictionary<string, List<PostResult>> PostsByInsight { get; set; } = new();
    public ContentMetrics Metrics { get; set; } = new();
    public decimal TotalCost { get; set; }
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}

public class ProcessingOptions
{
    public bool CleanContent { get; set; } = true;
    public bool GenerateTitle { get; set; } = true;
    public int InsightCount { get; set; } = 5;
    public List<string> Platforms { get; set; } = new() { "linkedin" };
    public string PostStyle { get; set; } = "professional";
    public bool TrackCosts { get; set; } = true;
    public int MaxRetries { get; set; } = 3;
}

public class InsightExtractionOptions
{
    public int MinScore { get; set; } = 5;
    public List<string> PreferredCategories { get; set; } = new();
    public List<string> PreferredPostTypes { get; set; } = new();
    public bool IncludeQuotes { get; set; } = true;
    public bool RequireEvidence { get; set; } = false;
}

public class PostGenerationOptions
{
    public string Style { get; set; } = "professional";
    public bool IncludeHashtags { get; set; } = true;
    public bool IncludeEmojis { get; set; } = false;
    public int MaxRetries { get; set; } = 3;
    public int? MaxLength { get; set; }
}

public class ContentMetrics
{
    public int WordCount { get; set; }
    public int CharacterCount { get; set; }
    public int EstimatedReadingTime { get; set; } // in seconds
    public double SentimentScore { get; set; } // -1 to 1
    public List<string> KeyTopics { get; set; } = new();
    public Dictionary<string, int> WordFrequency { get; set; } = new();
}

public class ProcessingCostEstimate
{
    public decimal TranscriptionCost { get; set; }
    public decimal CleaningCost { get; set; }
    public decimal InsightExtractionCost { get; set; }
    public decimal PostGenerationCost { get; set; }
    public decimal TotalCost { get; set; }
    public int EstimatedTokens { get; set; }
    public string Model { get; set; } = "gemini-pro";
}