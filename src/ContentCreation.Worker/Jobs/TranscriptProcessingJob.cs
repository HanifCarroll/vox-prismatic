using ContentCreation.Core.Interfaces;
using ContentCreation.Core.Entities;
using ContentCreation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Worker.Jobs;

public class TranscriptProcessingJob
{
    private readonly ILogger<TranscriptProcessingJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IDeepgramService _deepgramService;
    private readonly IAiService _aiService;
    private readonly IContentProjectService _projectService;

    public TranscriptProcessingJob(
        ILogger<TranscriptProcessingJob> logger,
        ApplicationDbContext context,
        IDeepgramService deepgramService,
        IAiService aiService,
        IContentProjectService projectService)
    {
        _logger = logger;
        _context = context;
        _deepgramService = deepgramService;
        _aiService = aiService;
        _projectService = projectService;
    }

    [Queue("critical")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task ProcessTranscript(string projectId, string audioUrl)
    {
        _logger.LogInformation("Starting transcript processing for project {ProjectId}", projectId);
        
        var job = await CreateProcessingJob(projectId, "transcript_processing");
        
        try
        {
            // Get the project
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            // Update job status
            await UpdateJobStatus(job, "processing", 10);
            
            // Process with Deepgram
            _logger.LogInformation("Transcribing audio with Deepgram");
            var transcriptText = await _deepgramService.TranscribeAudioAsync(audioUrl);
            
            await UpdateJobStatus(job, "processing", 50);
            
            // Clean transcript with AI
            _logger.LogInformation("Cleaning transcript with AI");
            var cleanedTranscript = await _aiService.CleanTranscriptAsync(transcriptText);
            
            await UpdateJobStatus(job, "processing", 80);
            
            // Update transcript
            if (project.Transcript != null)
            {
                project.Transcript.RawContent = transcriptText;
                project.Transcript.ProcessedContent = cleanedTranscript;
                project.Transcript.Status = "processed";
                project.Transcript.UpdatedAt = DateTime.UtcNow;
            }
            
            // Transition project stage
            project.CurrentStage = "content_processed";
            project.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Complete job
            await CompleteJob(job, 1);
            
            _logger.LogInformation("Transcript processing completed for project {ProjectId}", projectId);
            
            // Queue next step if configured
            if (project.WorkflowConfig?.AutoExtractInsights == true)
            {
                BackgroundJob.Enqueue<InsightExtractionJob>(job => job.ExtractInsights(projectId));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing transcript for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(string projectId, string jobType)
    {
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = jobType,
            Status = "queued",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        return job;
    }

    private async Task UpdateJobStatus(ProjectProcessingJob job, string status, int progress)
    {
        job.Status = status;
        job.Progress = progress;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (status == "processing" && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CompleteJob(ProjectProcessingJob job, int resultCount)
    {
        job.Status = "completed";
        job.Progress = 100;
        job.ResultCount = resultCount;
        job.CompletedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (job.StartedAt.HasValue)
        {
            job.DurationMs = (int)(job.CompletedAt.Value - job.StartedAt.Value).TotalMilliseconds;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task FailJob(ProjectProcessingJob job, string errorMessage)
    {
        job.Status = "failed";
        job.ErrorMessage = errorMessage;
        job.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
    }
}