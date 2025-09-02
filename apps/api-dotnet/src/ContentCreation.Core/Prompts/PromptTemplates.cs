namespace ContentCreation.Core.Prompts;

public static class PromptTemplates
{
    // Transcript Processing Templates
    public static class Transcript
    {
        public const string CleanTranscript = @"
You are a professional editor specializing in transcript refinement.

Clean and format the following transcript according to these guidelines:
- Remove filler words (um, uh, like, you know) unless they add meaning
- Fix grammar and punctuation errors
- Organize content into clear, logical paragraphs
- Maintain the speaker's voice and intent
- Preserve important quotes verbatim
- Add appropriate paragraph breaks for readability
- Keep technical terms and proper nouns accurate

Transcript:
{transcript}

Return the cleaned transcript maintaining all key information:";

        public const string GenerateTitle = @"
Create a compelling title for this content that:
- Is 5-10 words long
- Captures the main theme or value proposition
- Uses active, engaging language
- Would work well as a headline
- Avoids clickbait while remaining interesting

Content:
{content}

Title:";

        public const string SummarizeTranscript = @"
Create a comprehensive summary of this transcript that:
- Captures all main points and key insights
- Maintains chronological flow where relevant
- Highlights actionable takeaways
- Preserves important statistics or data points
- Is approximately {targetLength} words

Transcript:
{transcript}

Summary:";
    }

    // Insight Extraction Templates
    public static class Insights
    {
        public const string ExtractInsights = @"
You are an expert content analyst. Extract {count} valuable insights from this content.

Each insight should be:
- Self-contained and understandable without context
- Actionable, thought-provoking, or educational
- Suitable for social media sharing
- Backed by evidence from the content
- Unique (no overlapping insights)

Content:
{content}

Return exactly {count} insights in JSON format:
[{{
  ""Title"": ""Concise 5-10 word title"",
  ""Summary"": ""2-3 sentence explanation of the insight"",
  ""VerbatimQuote"": ""Exact supporting quote from content (if applicable)"",
  ""Category"": ""business|technology|personal|education|health|other"",
  ""PostType"": ""tip|quote|statistic|story|question|announcement"",
  ""UrgencyScore"": 1-10 (time-sensitivity),
  ""RelatabilityScore"": 1-10 (audience connection),
  ""SpecificityScore"": 1-10 (concrete vs abstract),
  ""AuthorityScore"": 1-10 (expertise demonstrated)
}}]

Insights JSON:";

        public const string ScoreInsight = @"
Evaluate this insight across multiple dimensions:

Insight: {insight}

Score the following (1-10 scale):
1. Urgency: How time-sensitive is this information?
2. Relatability: How well will the target audience connect?
3. Specificity: How concrete and actionable is it?
4. Authority: How much expertise does it demonstrate?
5. Shareability: How likely is it to be shared on social media?

Return scores in JSON format:
{{
  ""urgency"": 0,
  ""relatability"": 0,
  ""specificity"": 0,
  ""authority"": 0,
  ""shareability"": 0,
  ""totalScore"": 0,
  ""reasoning"": ""Brief explanation""
}}";
    }

    // Post Generation Templates
    public static class Posts
    {
        public static class LinkedIn
        {
            public const string Professional = @"
Create a LinkedIn post that:
- Maintains a professional, authoritative tone
- Provides clear value to business professionals
- Uses industry-appropriate language
- Includes 3-5 relevant hashtags
- Stays within 1300 characters
- Has a strong hook in the first line
- Ends with a call-to-action or thought-provoking question

Content: {content}

LinkedIn post:";

            public const string Casual = @"
Create a LinkedIn post that:
- Uses a conversational, approachable tone
- Shares personal experience or story
- Remains professional but relatable
- Includes 2-3 relevant hashtags
- Stays within 1300 characters
- Starts with an engaging personal anecdote
- Encourages discussion in comments

Content: {content}

LinkedIn post:";

            public const string Educational = @"
Create a LinkedIn post that:
- Teaches a specific concept or skill
- Uses clear, structured formatting (bullets/numbers)
- Provides actionable takeaways
- Includes 3-4 educational hashtags
- Stays within 1300 characters
- Opens with ""Here's what I learned...""
- Closes with additional resources or next steps

Content: {content}

LinkedIn post:";
        }

        public static string GetTemplate(string platform, string style, string postType = "standard")
        {
            var key = $"{platform.ToLower()}_{style.ToLower()}_{postType.ToLower()}";
            
            return key switch
            {
                "linkedin_professional_standard" => LinkedIn.Professional,
                "linkedin_casual_standard" => LinkedIn.Casual,
                "linkedin_educational_standard" => LinkedIn.Educational,
                _ => @"Create a social media post based on this content:
{content}

Post:"
            };
        }
    }

    // Analysis Templates
    public static class Analysis
    {
        public const string SentimentAnalysis = @"
Analyze the sentiment of this content:

Content: {content}

Provide a detailed sentiment analysis:
1. Overall sentiment (positive/negative/neutral)
2. Sentiment score (-1 to 1)
3. Emotional tone (professional/casual/urgent/etc.)
4. Key emotional indicators
5. Audience reaction prediction

Return in JSON format:
{{
  ""overallSentiment"": """",
  ""score"": 0.0,
  ""tone"": """",
  ""indicators"": [],
  ""predictedReaction"": """"
}}";

        public const string TopicExtraction = @"
Extract the main topics and themes from this content:

Content: {content}

Identify:
1. Primary topic (main subject)
2. Secondary topics (supporting themes)
3. Key concepts mentioned
4. Industry/domain classification
5. Target audience

Return in JSON format:
{{
  ""primaryTopic"": """",
  ""secondaryTopics"": [],
  ""keyConcepts"": [],
  ""domain"": """",
  ""targetAudience"": """"
}}";

        public const string KeywordExtraction = @"
Extract SEO-optimized keywords from this content:

Content: {content}

Provide:
1. Primary keywords (3-5 most important)
2. Long-tail keywords (5-7 specific phrases)
3. LSI keywords (semantically related terms)
4. Hashtag suggestions
5. Search intent classification

Return in JSON format:
{{
  ""primaryKeywords"": [],
  ""longTailKeywords"": [],
  ""lsiKeywords"": [],
  ""hashtags"": [],
  ""searchIntent"": """"
}}";
    }

    // Content Enhancement Templates
    public static class Enhancement
    {
        public const string AddStatistics = @"
Enhance this content with relevant statistics and data:

Original content: {content}

Add:
1. Relevant industry statistics
2. Supporting data points
3. Comparative metrics
4. Trend information
5. Credibility markers

Enhanced content with statistics:";

        public const string AddStorytelling = @"
Transform this content using storytelling techniques:

Original content: {content}

Apply:
1. Narrative structure (beginning, middle, end)
2. Character or persona development
3. Conflict and resolution
4. Emotional connection points
5. Memorable analogies or metaphors

Story-driven version:";

        public const string SimplifyLanguage = @"
Simplify this content for broader audience understanding:

Original content: {content}

Simplify by:
1. Replacing jargon with common terms
2. Breaking down complex concepts
3. Using shorter sentences
4. Adding clarifying examples
5. Maintaining accuracy while improving clarity

Simplified version:";
    }

    // Utility method to replace placeholders
    public static string Format(string template, Dictionary<string, string> parameters)
    {
        var result = template;
        foreach (var param in parameters)
        {
            result = result.Replace($"{{{param.Key}}}", param.Value);
        }
        return result;
    }
}