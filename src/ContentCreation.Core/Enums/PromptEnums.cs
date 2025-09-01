namespace ContentCreation.Core.Enums;

public enum PromptCategory
{
    TranscriptCleaning,
    InsightExtraction,
    PostGeneration,
    Summarization,
    TitleGeneration,
    HashtagGeneration,
    ContentScoring,
    Custom
}

public enum PromptStatus
{
    Draft,
    Active,
    Inactive,
    Archived,
    Testing
}

public enum PromptModel
{
    GeminiPro,
    GeminiProVision,
    Gpt4,
    Gpt35Turbo,
    Claude3,
    Custom
}