using ContentCreation.Core.DTOs.AI;

namespace ContentCreation.Core.Interfaces;

public interface IAIService
{
    Task<CleanTranscriptResult> CleanTranscriptAsync(CleanTranscriptRequest request);
    Task<ExtractInsightsResult> ExtractInsightsAsync(ExtractInsightsRequest request);
    Task<GeneratePostsResult> GeneratePostsAsync(GeneratePostsRequest request);
    Task<string> GenerateSummaryAsync(string content, int maxLength = 500);
    Task<List<string>> GenerateHashtagsAsync(string content, string platform, int maxCount = 10);
    Task<double> CalculateContentScoreAsync(string content);
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