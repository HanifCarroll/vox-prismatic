using Microsoft.EntityFrameworkCore.Storage;
using ContentCreation.Core.Interfaces.Repositories;
using ContentCreation.Infrastructure.Data;

namespace ContentCreation.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IDbContextTransaction? _transaction;

    private IContentProjectRepository? _contentProjects;
    private ITranscriptRepository? _transcripts;
    private IInsightRepository? _insights;
    private IPostRepository? _posts;
    private IScheduledPostRepository? _scheduledPosts;
    private IProjectActivityRepository? _projectActivities;
    private INotificationRepository? _notifications;
    private IOAuthTokenRepository? _oAuthTokens;
    private IUserRepository? _users;
    private IPromptTemplateRepository? _promptTemplates;
    private IProjectEventRepository? _projectEvents;
    private IProjectMetricsRepository? _projectMetrics;
    private IProjectProcessingJobRepository? _projectProcessingJobs;
    private IProjectScheduledPostRepository? _projectScheduledPosts;
    private ISettingRepository? _settings;
    private IAnalyticsEventRepository? _analyticsEvents;
    private IPlatformAuthRepository? _platformAuths;
    private IWorkflowConfigurationRepository? _workflowConfigurations;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    public IContentProjectRepository ContentProjects =>
        _contentProjects ??= new ContentProjectRepository(_context);

    public ITranscriptRepository Transcripts =>
        _transcripts ??= new TranscriptRepository(_context);

    public IInsightRepository Insights =>
        _insights ??= new InsightRepository(_context);

    public IPostRepository Posts =>
        _posts ??= new PostRepository(_context);

    public IScheduledPostRepository ScheduledPosts =>
        _scheduledPosts ??= new ScheduledPostRepository(_context);

    public IProjectActivityRepository ProjectActivities =>
        _projectActivities ??= new ProjectActivityRepository(_context);

    public INotificationRepository Notifications =>
        _notifications ??= new NotificationRepository(_context);

    public IOAuthTokenRepository OAuthTokens =>
        _oAuthTokens ??= new OAuthTokenRepository(_context);

    public IUserRepository Users =>
        _users ??= new UserRepository(_context);

    public IPromptTemplateRepository PromptTemplates =>
        _promptTemplates ??= new PromptTemplateRepository(_context);

    public IProjectEventRepository ProjectEvents =>
        _projectEvents ??= new ProjectEventRepository(_context);

    public IProjectMetricsRepository ProjectMetrics =>
        _projectMetrics ??= new ProjectMetricsRepository(_context);

    public IProjectProcessingJobRepository ProjectProcessingJobs =>
        _projectProcessingJobs ??= new ProjectProcessingJobRepository(_context);

    public IProjectScheduledPostRepository ProjectScheduledPosts =>
        _projectScheduledPosts ??= new ProjectScheduledPostRepository(_context);

    public ISettingRepository Settings =>
        _settings ??= new SettingRepository(_context);

    public IAnalyticsEventRepository AnalyticsEvents =>
        _analyticsEvents ??= new AnalyticsEventRepository(_context);

    public IPlatformAuthRepository PlatformAuths =>
        _platformAuths ??= new PlatformAuthRepository(_context);

    public IWorkflowConfigurationRepository WorkflowConfigurations =>
        _workflowConfigurations ??= new WorkflowConfigurationRepository(_context);

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    public async Task CommitTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}