namespace ContentCreation.Core.Interfaces;

public interface IPublishingService
{
    Task PublishPostAsync(string projectId, string postId);
    Task PublishScheduledPostsAsync();
    Task RetryFailedPostAsync(string scheduledPostId);
}