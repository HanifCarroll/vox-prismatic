namespace ContentCreation.Core.DTOs.AI;

public class CleanTranscriptRequest
{
    public string RawContent { get; set; } = string.Empty;
    public string? SourceType { get; set; }
    public Dictionary<string, object>? Options { get; set; }
}

public class CleanTranscriptResult
{
    public string CleanedContent { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public List<string> RemovedSections { get; set; } = new();
    public Dictionary<string, object>? Metadata { get; set; }
}

public class ExtractInsightsRequest
{
    public string Content { get; set; } = string.Empty;
    public int MaxInsights { get; set; } = 5;
    public List<string>? Topics { get; set; }
    public Dictionary<string, object>? Options { get; set; }
}

public class ExtractedInsight
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string VerbatimQuote { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public double ConfidenceScore { get; set; }
    public int UrgencyScore { get; set; }
    public int RelatabilityScore { get; set; }
    public int SpecificityScore { get; set; }
    public int AuthorityScore { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class ExtractInsightsResult
{
    public List<ExtractedInsight> Insights { get; set; } = new();
    public int TotalExtracted { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class GeneratePostsRequest
{
    public List<ExtractedInsight> Insights { get; set; } = new();
    public List<string> Platforms { get; set; } = new();
    public Dictionary<string, object>? Options { get; set; }
}

public class GeneratedPost
{
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Title { get; set; }
    public List<string> Hashtags { get; set; } = new();
    public string? MediaUrl { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class GeneratePostsResult
{
    public List<GeneratedPost> Posts { get; set; } = new();
    public int TotalGenerated { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}