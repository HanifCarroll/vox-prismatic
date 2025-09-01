namespace ContentCreation.Core.Interfaces;

public interface IPostPublishingService
{
    Task PublishPostAsync(string projectId, string postId);
    Task PublishScheduledPostsAsync();
    Task RetryFailedPostAsync(string scheduledPostId);
}