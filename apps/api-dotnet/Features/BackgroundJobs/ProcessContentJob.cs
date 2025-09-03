using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Features.Common.Data;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class ProcessContentJob
{
    private readonly ILogger<ProcessContentJob> _logger;
    private readonly ApplicationDbContext _context;

    public ProcessContentJob(
        ILogger<ProcessContentJob> logger,
        ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    [Queue("default")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task ProcessContentAsync(Guid projectId)
    {
        _logger.LogInformation("Starting content processing for project {ProjectId}", projectId);
        
        try
        {
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .FirstOrDefaultAsync(p => p.Id == projectId);
                
            if (project == null)
            {
                _logger.LogWarning("Project {ProjectId} not found", projectId);
                return;
            }
            
            // Simulate processing - in a real implementation, this would process the actual content
            if (project.Transcript == null)
            {
                // Create a transcript entity
                var transcript = Transcript.Create(
                    projectId: projectId,
                    title: project.Title,
                    rawContent: "Raw content placeholder",
                    sourceType: project.SourceType,
                    sourceUrl: project.SourceUrl,
                    fileName: project.FileName,
                    filePath: project.FilePath
                );
                
                _context.Transcripts.Add(transcript);
                project.SetTranscriptId(transcript.Id);
            }
            
            // Mark transcript as processed
            if (project.Transcript != null)
            {
                project.Transcript.MarkAsProcessed();
            }
            
            // Complete processing
            project.CompleteProcessing();
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Completed content processing for project {ProjectId}", projectId);
            
            // Queue insight extraction
            BackgroundJob.Enqueue<InsightExtractionJob>(job => job.ExtractInsights(projectId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing content for project {ProjectId}", projectId);
            
            // Mark processing as failed
            var project = await _context.ContentProjects
                .FirstOrDefaultAsync(p => p.Id == projectId);
                
            if (project != null)
            {
                project.FailProcessing(ex.Message);
                await _context.SaveChangesAsync();
            }
            
            throw;
        }
    }
}