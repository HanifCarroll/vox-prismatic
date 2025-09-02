using ContentCreation.Core.Prompts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;

namespace ContentCreation.Infrastructure.Services.AI;

public interface IPromptService
{
    string GenerateCleanTranscriptPrompt(string transcript, CleaningOptions? options = null);
    string GenerateTitlePrompt(string content, TitleOptions? options = null);
    string GenerateInsightExtractionPrompt(string content, int count, InsightOptions? options = null);
    string GeneratePostPrompt(string content, string platform, string style, PostOptions? options = null);
    string GenerateAnalysisPrompt(string content, AnalysisType analysisType);
    string GenerateCustomPrompt(string template, Dictionary<string, string> parameters);
}

public class PromptService : IPromptService
{
    private readonly ILogger<PromptService> _logger;
    private readonly IConfiguration _configuration;
    private readonly Dictionary<string, string> _customTemplates;

    public PromptService(ILogger<PromptService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _customTemplates = new Dictionary<string, string>();
        LoadCustomTemplates();
    }

    public string GenerateCleanTranscriptPrompt(string transcript, CleaningOptions? options = null)
    {
        options ??= new CleaningOptions();
        
        var promptBuilder = new StringBuilder();
        promptBuilder.AppendLine("You are a professional transcript editor with expertise in content refinement.");
        promptBuilder.AppendLine();
        
        if (options.PreserveStyle)
        {
            promptBuilder.AppendLine("IMPORTANT: Preserve the speaker's unique voice and style.");
        }
        
        promptBuilder.AppendLine("Clean and format the following transcript:");
        promptBuilder.AppendLine("- Remove filler words (um, uh, like, you know) unless they add meaning");
        promptBuilder.AppendLine("- Fix grammar and punctuation errors");
        promptBuilder.AppendLine("- Organize content into clear paragraphs");
        
        if (options.PreserveTechnicalTerms)
        {
            promptBuilder.AppendLine("- Keep all technical terms and acronyms exactly as spoken");
        }
        
        if (options.AddTimestamps)
        {
            promptBuilder.AppendLine("- Add [TIMESTAMP] markers at major topic transitions");
        }
        
        if (options.IdentifySpeakers)
        {
            promptBuilder.AppendLine("- Clearly identify different speakers if multiple are present");
        }
        
        promptBuilder.AppendLine();
        promptBuilder.AppendLine($"Transcript ({transcript.Split(' ').Length} words):");
        promptBuilder.AppendLine(transcript);
        promptBuilder.AppendLine();
        promptBuilder.AppendLine("Cleaned transcript:");
        
        return promptBuilder.ToString();
    }

    public string GenerateTitlePrompt(string content, TitleOptions? options = null)
    {
        options ??= new TitleOptions();
        
        var parameters = new Dictionary<string, string>
        {
            { "content", TruncateContent(content, options.MaxContentLength) }
        };
        
        var basePrompt = PromptTemplates.Format(PromptTemplates.Transcript.GenerateTitle, parameters);
        
        if (options.IncludeKeywords?.Any() == true)
        {
            basePrompt = basePrompt.Replace("Title:", 
                $"Title (include keywords: {string.Join(", ", options.IncludeKeywords)}):");
        }
        
        if (options.Style != TitleStyle.Standard)
        {
            var styleGuide = options.Style switch
            {
                TitleStyle.Clickbait => "Make it attention-grabbing and curiosity-inducing",
                TitleStyle.Academic => "Use formal, descriptive language",
                TitleStyle.SEO => "Optimize for search engines with relevant keywords",
                TitleStyle.Question => "Frame as an engaging question",
                _ => ""
            };
            
            basePrompt = basePrompt.Replace("Title:", $"Title ({styleGuide}):");
        }
        
        return basePrompt;
    }

    public string GenerateInsightExtractionPrompt(string content, int count, InsightOptions? options = null)
    {
        options ??= new InsightOptions();
        
        var promptBuilder = new StringBuilder();
        promptBuilder.AppendLine($"You are an expert content analyst specializing in {options.Domain ?? "general"} content.");
        promptBuilder.AppendLine();
        promptBuilder.AppendLine($"Extract exactly {count} valuable insights from this content.");
        promptBuilder.AppendLine();
        
        promptBuilder.AppendLine("Requirements for each insight:");
        promptBuilder.AppendLine("- Must be self-contained and understandable without context");
        promptBuilder.AppendLine("- Should be actionable, thought-provoking, or educational");
        promptBuilder.AppendLine("- Suitable for social media sharing");
        
        if (options.RequireEvidence)
        {
            promptBuilder.AppendLine("- MUST include supporting evidence or data from the content");
        }
        
        if (options.FocusOnActionable)
        {
            promptBuilder.AppendLine("- Prioritize actionable takeaways over theoretical concepts");
        }
        
        if (options.TargetAudience != null)
        {
            promptBuilder.AppendLine($"- Tailored for {options.TargetAudience} audience");
        }
        
        if (options.ExcludeCategories?.Any() == true)
        {
            promptBuilder.AppendLine($"- Avoid these categories: {string.Join(", ", options.ExcludeCategories)}");
        }
        
        promptBuilder.AppendLine();
        promptBuilder.AppendLine("Content to analyze:");
        promptBuilder.AppendLine(TruncateContent(content, 3000));
        promptBuilder.AppendLine();
        
        promptBuilder.AppendLine("Return insights in this exact JSON format:");
        promptBuilder.AppendLine("[{");
        promptBuilder.AppendLine("  \"Title\": \"Concise 5-10 word title\",");
        promptBuilder.AppendLine("  \"Summary\": \"2-3 sentence explanation\",");
        promptBuilder.AppendLine("  \"VerbatimQuote\": \"Exact quote if applicable\",");
        promptBuilder.AppendLine("  \"Category\": \"business|technology|personal|education|health|other\",");
        promptBuilder.AppendLine("  \"PostType\": \"tip|quote|statistic|story|question|announcement\",");
        promptBuilder.AppendLine("  \"UrgencyScore\": 8,");
        promptBuilder.AppendLine("  \"RelatabilityScore\": 7,");
        promptBuilder.AppendLine("  \"SpecificityScore\": 9,");
        promptBuilder.AppendLine("  \"AuthorityScore\": 8");
        promptBuilder.AppendLine("}]");
        promptBuilder.AppendLine();
        promptBuilder.AppendLine("JSON output:");
        
        return promptBuilder.ToString();
    }

    public string GeneratePostPrompt(string content, string platform, string style, PostOptions? options = null)
    {
        options ??= new PostOptions();
        
        var template = PromptTemplates.Posts.GetTemplate(platform, style, options.PostType);
        var parameters = new Dictionary<string, string>
        {
            { "content", TruncateContent(content, 1000) }
        };
        
        var basePrompt = PromptTemplates.Format(template, parameters);
        
        // Enhance prompt with additional options
        var enhancements = new List<string>();
        
        if (options.IncludeHashtags)
        {
            enhancements.Add($"Include {options.HashtagCount} relevant hashtags");
        }
        
        if (options.IncludeEmojis)
        {
            enhancements.Add("Use 2-3 appropriate emojis for engagement");
        }
        
        if (options.IncludeCTA)
        {
            enhancements.Add("End with a clear call-to-action");
        }
        
        if (options.IncludeQuestion)
        {
            enhancements.Add("Include an engaging question to spark discussion");
        }
        
        if (options.Tone != null)
        {
            enhancements.Add($"Maintain a {options.Tone} tone throughout");
        }
        
        if (options.MaxLength.HasValue)
        {
            enhancements.Add($"Keep under {options.MaxLength} characters");
        }
        
        if (enhancements.Any())
        {
            var enhancementText = "\n\nAdditional requirements:\n" + string.Join("\n", enhancements.Select(e => $"- {e}"));
            basePrompt = basePrompt.Replace($"{platform} post:", $"{platform} post{enhancementText}\n\nPost:");
        }
        
        return basePrompt;
    }

    public string GenerateAnalysisPrompt(string content, AnalysisType analysisType)
    {
        var template = analysisType switch
        {
            AnalysisType.Sentiment => PromptTemplates.Analysis.SentimentAnalysis,
            AnalysisType.Topics => PromptTemplates.Analysis.TopicExtraction,
            AnalysisType.Keywords => PromptTemplates.Analysis.KeywordExtraction,
            _ => throw new ArgumentException($"Unknown analysis type: {analysisType}")
        };
        
        var parameters = new Dictionary<string, string>
        {
            { "content", TruncateContent(content, 2000) }
        };
        
        return PromptTemplates.Format(template, parameters);
    }

    public string GenerateCustomPrompt(string template, Dictionary<string, string> parameters)
    {
        // Check if it's a reference to a custom template
        if (_customTemplates.ContainsKey(template))
        {
            template = _customTemplates[template];
        }
        
        return PromptTemplates.Format(template, parameters);
    }

    private void LoadCustomTemplates()
    {
        // Load custom templates from configuration if available
        var customTemplatesSection = _configuration.GetSection("CustomPromptTemplates");
        if (customTemplatesSection.Exists())
        {
            foreach (var template in customTemplatesSection.GetChildren())
            {
                _customTemplates[template.Key] = template.Value ?? string.Empty;
                _logger.LogInformation("Loaded custom template: {Key}", template.Key);
            }
        }
    }

    private string TruncateContent(string content, int maxLength = 2000)
    {
        if (content.Length <= maxLength)
            return content;
        
        // Try to truncate at a sentence boundary
        var truncated = content.Substring(0, maxLength);
        var lastPeriod = truncated.LastIndexOf('.');
        var lastQuestion = truncated.LastIndexOf('?');
        var lastExclamation = truncated.LastIndexOf('!');
        
        var lastSentenceEnd = Math.Max(Math.Max(lastPeriod, lastQuestion), lastExclamation);
        
        if (lastSentenceEnd > maxLength * 0.8) // If we have a sentence end in the last 20%
        {
            return content.Substring(0, lastSentenceEnd + 1) + " [content truncated]";
        }
        
        return truncated + "... [content truncated]";
    }
}

// Supporting classes for prompt options
public class CleaningOptions
{
    public bool PreserveStyle { get; set; } = true;
    public bool PreserveTechnicalTerms { get; set; } = true;
    public bool AddTimestamps { get; set; } = false;
    public bool IdentifySpeakers { get; set; } = false;
}

public class TitleOptions
{
    public TitleStyle Style { get; set; } = TitleStyle.Standard;
    public List<string>? IncludeKeywords { get; set; }
    public int MaxContentLength { get; set; } = 1000;
}

public enum TitleStyle
{
    Standard,
    Clickbait,
    Academic,
    SEO,
    Question
}

public class InsightOptions
{
    public string? Domain { get; set; }
    public string? TargetAudience { get; set; }
    public bool RequireEvidence { get; set; } = false;
    public bool FocusOnActionable { get; set; } = true;
    public List<string>? ExcludeCategories { get; set; }
}

public class PostOptions
{
    public string PostType { get; set; } = "standard";
    public bool IncludeHashtags { get; set; } = true;
    public int HashtagCount { get; set; } = 3;
    public bool IncludeEmojis { get; set; } = false;
    public bool IncludeCTA { get; set; } = true;
    public bool IncludeQuestion { get; set; } = false;
    public string? Tone { get; set; }
    public int? MaxLength { get; set; }
}

public enum AnalysisType
{
    Sentiment,
    Topics,
    Keywords
}