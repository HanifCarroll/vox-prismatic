namespace ContentCreation.Core.Interfaces;

public interface IContentProcessingService
{
    Task ProcessTranscriptAsync(string projectId, string jobId);
    Task ExtractInsightsAsync(string projectId, string jobId);
    Task GeneratePostsAsync(string projectId, string jobId, List<string> insightIds);
}

public interface IPublishingService
{
    Task PublishPostAsync(string projectId, string postId);
    Task PublishToLinkedInAsync(string postId);
    Task PublishToXAsync(string postId);
}