namespace ContentCreation.Core.Interfaces.Repositories;

public interface IUnitOfWork : IDisposable
{
    IContentProjectRepository ContentProjects { get; }
    ITranscriptRepository Transcripts { get; }
    IInsightRepository Insights { get; }
    IPostRepository Posts { get; }
    IScheduledPostRepository ScheduledPosts { get; }
    IProjectActivityRepository ProjectActivities { get; }
    INotificationRepository Notifications { get; }
    IOAuthTokenRepository OAuthTokens { get; }
    IUserRepository Users { get; }
    IPromptTemplateRepository PromptTemplates { get; }
    IProjectEventRepository ProjectEvents { get; }
    IProjectMetricsRepository ProjectMetrics { get; }
    IProjectProcessingJobRepository ProjectProcessingJobs { get; }
    IProjectScheduledPostRepository ProjectScheduledPosts { get; }
    ISettingRepository Settings { get; }
    IAnalyticsEventRepository AnalyticsEvents { get; }
    IPlatformAuthRepository PlatformAuths { get; }
    IWorkflowConfigurationRepository WorkflowConfigurations { get; }
    
    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}