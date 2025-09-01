namespace ContentCreation.Core.Interfaces;

public interface IAIService
{
    Task<string> CleanTranscriptAsync(string rawTranscript);
    Task<string> GenerateTitleAsync(string content);
    Task<List<InsightResult>> ExtractInsightsAsync(string cleanedTranscript);
    Task<List<PostResult>> GeneratePostsAsync(string insight, List<string> platforms);
}

public class InsightResult
{
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string VerbatimQuote { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public int UrgencyScore { get; set; }
    public int RelatabilityScore { get; set; }
    public int SpecificityScore { get; set; }
    public int AuthorityScore { get; set; }
}

public class PostResult
{
    public string Platform { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int CharacterCount { get; set; }
}

public interface ITranscriptionService
{
    Task<TranscriptionResult> TranscribeAudioAsync(string filePath);
}

public class TranscriptionResult
{
    public string Text { get; set; } = string.Empty;
    public int? Duration { get; set; }
    public float Confidence { get; set; }
}