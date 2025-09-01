using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Enums;
using ContentCreation.Infrastructure.Data;
using AutoMapper;
using MediatR;
using Hangfire;

namespace ContentCreation.Infrastructure.Services;

public class TranscriptStateService : ITranscriptStateService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IMediator _mediator;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<TranscriptStateService> _logger;

    public TranscriptStateService(
        ApplicationDbContext context,
        IMapper mapper,
        IMediator mediator,
        IBackgroundJobClient backgroundJobClient,
        ILogger<TranscriptStateService> logger)
    {
        _context = context;
        _mapper = mapper;
        _mediator = mediator;
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    public async Task<TranscriptDto> StartProcessingAsync(string id)
    {
        _logger.LogInformation("Starting processing for transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Validate state transition
        if (!await CanTransitionAsync(id, TranscriptAction.StartProcessing))
        {
            throw new InvalidOperationException($"Cannot start processing transcript in status: {transcript.Status}");
        }

        transcript.Status = "processing";
        transcript.UpdatedAt = DateTime.UtcNow;
        transcript.ErrorMessage = null;
        transcript.FailedAt = null;

        // Update project stage if needed
        if (transcript.ContentProject != null)
        {
            transcript.ContentProject.CurrentStage = ProjectLifecycleStage.TranscriptProcessing;
            transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
            transcript.ContentProject.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Schedule background processing job
        var jobId = _backgroundJobClient.Enqueue(() => ProcessTranscriptBackground(id));
        transcript.QueueJobId = jobId;
        await _context.SaveChangesAsync();

        // Publish event
        await PublishTranscriptProcessingStartedEvent(transcript);

        _logger.LogInformation("Started processing for transcript: {TranscriptId} with job: {JobId}", id, jobId);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<TranscriptDto> MarkCleanedAsync(string id, string? cleanedContent = null)
    {
        _logger.LogInformation("Marking transcript as cleaned: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Validate state transition
        if (!await CanTransitionAsync(id, TranscriptAction.MarkCleaned))
        {
            throw new InvalidOperationException($"Cannot mark transcript as cleaned in status: {transcript.Status}");
        }

        transcript.Status = "cleaned";
        transcript.UpdatedAt = DateTime.UtcNow;
        
        if (!string.IsNullOrEmpty(cleanedContent))
        {
            transcript.CleanedContent = cleanedContent;
        }

        // Update project progress
        if (transcript.ContentProject != null)
        {
            transcript.ContentProject.CurrentStage = ProjectLifecycleStage.TranscriptCleaned;
            transcript.ContentProject.OverallProgress = 25; // 25% complete after cleaning
            transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
            transcript.ContentProject.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Schedule insight generation
        var jobId = _backgroundJobClient.Enqueue(() => GenerateInsightsFromTranscript(id));
        _logger.LogInformation("Scheduled insight generation job {JobId} for transcript {TranscriptId}", jobId, id);

        // Publish event
        await PublishTranscriptCleanedEvent(transcript);

        _logger.LogInformation("Marked transcript as cleaned: {TranscriptId}", id);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<TranscriptDto> MarkFailedAsync(string id, string errorMessage)
    {
        _logger.LogInformation("Marking transcript as failed: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Validate state transition
        if (!await CanTransitionAsync(id, TranscriptAction.MarkFailed))
        {
            throw new InvalidOperationException($"Cannot mark transcript as failed in status: {transcript.Status}");
        }

        transcript.Status = "error";
        transcript.ErrorMessage = errorMessage;
        transcript.FailedAt = DateTime.UtcNow;
        transcript.UpdatedAt = DateTime.UtcNow;

        // Update project to reflect error
        if (transcript.ContentProject != null)
        {
            transcript.ContentProject.CurrentStage = ProjectLifecycleStage.Error;
            transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
            transcript.ContentProject.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Publish event
        await PublishTranscriptFailedEvent(transcript, errorMessage);

        _logger.LogWarning("Marked transcript as failed: {TranscriptId} with error: {Error}", id, errorMessage);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<TranscriptDto> MarkInsightsGeneratedAsync(string id)
    {
        _logger.LogInformation("Marking insights generated for transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .Include(t => t.Insights)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Validate state transition
        if (!await CanTransitionAsync(id, TranscriptAction.MarkInsightsGenerated))
        {
            throw new InvalidOperationException($"Cannot mark insights generated for transcript in status: {transcript.Status}");
        }

        transcript.Status = "insights_generated";
        transcript.UpdatedAt = DateTime.UtcNow;

        // Update project progress
        if (transcript.ContentProject != null)
        {
            transcript.ContentProject.CurrentStage = ProjectLifecycleStage.InsightsExtracted;
            transcript.ContentProject.OverallProgress = 50; // 50% complete after insights
            transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
            transcript.ContentProject.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Schedule post generation from insights
        if (transcript.Insights?.Any() == true)
        {
            foreach (var insight in transcript.Insights)
            {
                var jobId = _backgroundJobClient.Enqueue(() => GeneratePostsFromInsight(insight.Id));
                _logger.LogInformation("Scheduled post generation job {JobId} for insight {InsightId}", jobId, insight.Id);
            }
        }

        // Publish event
        await PublishInsightsGeneratedEvent(transcript);

        _logger.LogInformation("Marked insights generated for transcript: {TranscriptId}", id);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<TranscriptDto> MarkPostsCreatedAsync(string id)
    {
        _logger.LogInformation("Marking posts created for transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Validate state transition
        if (!await CanTransitionAsync(id, TranscriptAction.MarkPostsCreated))
        {
            throw new InvalidOperationException($"Cannot mark posts created for transcript in status: {transcript.Status}");
        }

        transcript.Status = "posts_created";
        transcript.UpdatedAt = DateTime.UtcNow;

        // Update project to complete stage
        if (transcript.ContentProject != null)
        {
            transcript.ContentProject.CurrentStage = ProjectLifecycleStage.PostsGenerated;
            transcript.ContentProject.OverallProgress = 75; // 75% complete after posts
            transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
            transcript.ContentProject.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Publish event
        await PublishPostsCreatedEvent(transcript);

        _logger.LogInformation("Marked posts created for transcript: {TranscriptId}", id);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<TranscriptDto> RetryProcessingAsync(string id)
    {
        _logger.LogInformation("Retrying processing for transcript: {TranscriptId}", id);

        var transcript = await _context.Transcripts
            .Include(t => t.ContentProject)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transcript == null)
        {
            throw new KeyNotFoundException($"Transcript with ID {id} not found");
        }

        // Validate state transition
        if (!await CanTransitionAsync(id, TranscriptAction.Retry))
        {
            throw new InvalidOperationException($"Cannot retry processing for transcript in status: {transcript.Status}");
        }

        // Reset to raw status for reprocessing
        transcript.Status = "raw";
        transcript.ErrorMessage = null;
        transcript.FailedAt = null;
        transcript.UpdatedAt = DateTime.UtcNow;

        // Reset project stage
        if (transcript.ContentProject != null)
        {
            transcript.ContentProject.CurrentStage = ProjectLifecycleStage.RawContent;
            transcript.ContentProject.UpdatedAt = DateTime.UtcNow;
            transcript.ContentProject.LastActivityAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Schedule reprocessing
        var jobId = _backgroundJobClient.Enqueue(() => ProcessTranscriptBackground(id));
        transcript.QueueJobId = jobId;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Scheduled retry processing job {JobId} for transcript {TranscriptId}", jobId, id);
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<bool> CanTransitionAsync(string id, TranscriptAction action)
    {
        var transcript = await _context.Transcripts.FindAsync(id);
        if (transcript == null)
        {
            return false;
        }

        var currentStatus = transcript.Status?.ToLower() ?? "raw";

        return action switch
        {
            TranscriptAction.StartProcessing => currentStatus == "raw",
            TranscriptAction.MarkCleaned => currentStatus == "processing",
            TranscriptAction.MarkFailed => currentStatus == "processing" || currentStatus == "raw",
            TranscriptAction.MarkInsightsGenerated => currentStatus == "cleaned",
            TranscriptAction.MarkPostsCreated => currentStatus == "insights_generated",
            TranscriptAction.Retry => currentStatus == "error",
            TranscriptAction.Delete => true, // Can always delete
            _ => false
        };
    }

    // Background job methods (would be executed by Hangfire)
    public static void ProcessTranscriptBackground(string transcriptId)
    {
        // This would be implemented with actual transcript processing logic
        Console.WriteLine($"Processing transcript in background: {transcriptId}");
    }

    public static void GenerateInsightsFromTranscript(string transcriptId)
    {
        // This would be implemented with actual insight generation logic
        Console.WriteLine($"Generating insights from transcript: {transcriptId}");
    }

    public static void GeneratePostsFromInsight(string insightId)
    {
        // This would be implemented with actual post generation logic
        Console.WriteLine($"Generating posts from insight: {insightId}");
    }

    // Event publishing methods
    private async Task PublishTranscriptProcessingStartedEvent(Transcript transcript)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            _logger.LogInformation("Published transcript processing started event for {TranscriptId}", transcript.Id);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish transcript processing started event");
        }
    }

    private async Task PublishTranscriptCleanedEvent(Transcript transcript)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            _logger.LogInformation("Published transcript cleaned event for {TranscriptId}", transcript.Id);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish transcript cleaned event");
        }
    }

    private async Task PublishTranscriptFailedEvent(Transcript transcript, string errorMessage)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            _logger.LogInformation("Published transcript failed event for {TranscriptId}: {Error}", 
                transcript.Id, errorMessage);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish transcript failed event");
        }
    }

    private async Task PublishInsightsGeneratedEvent(Transcript transcript)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            _logger.LogInformation("Published insights generated event for transcript {TranscriptId}", transcript.Id);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish insights generated event");
        }
    }

    private async Task PublishPostsCreatedEvent(Transcript transcript)
    {
        try
        {
            // This would publish an event using MediatR or another event bus
            _logger.LogInformation("Published posts created event for transcript {TranscriptId}", transcript.Id);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish posts created event");
        }
    }
}