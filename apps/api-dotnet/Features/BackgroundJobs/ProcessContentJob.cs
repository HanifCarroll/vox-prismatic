using ContentCreation.Api.Features.Common.Entities;
using ContentCreation.Api.Features.Common.Enums;
using ContentCreation.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Hangfire;
using Microsoft.Extensions.Logging;
using RestSharp;
using Mscc.GenerativeAI;
using System.Text.Json;

namespace ContentCreation.Api.Features.BackgroundJobs;

public class ProcessContentJob
{
    private readonly ILogger<ProcessContentJob> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly RestClient _deepgramClient;
    private readonly GenerativeModel _aiModel;
    private readonly string _deepgramApiKey;

    public ProcessContentJob(
        ILogger<ProcessContentJob> logger,
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _configuration = configuration;
        
        // Initialize Deepgram client
        _deepgramApiKey = configuration["DEEPGRAM_API_KEY"] 
            ?? throw new InvalidOperationException("DEEPGRAM_API_KEY is not configured");
        _deepgramClient = new RestClient("https://api.deepgram.com/v1/");
        
        // Initialize AI model
        var aiApiKey = configuration["GOOGLE_AI_API_KEY"] 
            ?? throw new InvalidOperationException("GOOGLE_AI_API_KEY is not configured");
        var googleAi = new GoogleAI(aiApiKey);
        _aiModel = googleAi.GenerativeModel(Model.Gemini15Pro);
    }

    [Queue("critical")]
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task ProcessContent(Guid projectId, string contentUrl, string contentType = "audio")
    {
        _logger.LogInformation("Starting content processing for project {ProjectId}, type: {ContentType}", 
            projectId, contentType);
        
        var job = await CreateProcessingJob(projectId, ProcessingJobType.ProcessContent);
        
        try
        {
            var project = await _context.ContentProjects
                .Include(p => p.Transcript)
                .FirstOrDefaultAsync(p => p.Id == projectId);
            
            if (project == null)
            {
                throw new Exception($"Project {projectId} not found");
            }
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 10);
            
            string rawContent;
            
            switch (contentType.ToLower())
            {
                case "audio":
                case "video":
                    _logger.LogInformation("Transcribing audio/video content with Deepgram");
                    rawContent = await TranscribeAudioAsync(contentUrl);
                    break;
                    
                case "text":
                case "article":
                    _logger.LogInformation("Processing text content");
                    rawContent = await FetchTextContent(contentUrl);
                    break;
                    
                case "document":
                    _logger.LogInformation("Processing document content");
                    rawContent = await ProcessDocumentContent(contentUrl);
                    break;
                    
                default:
                    throw new NotSupportedException($"Content type {contentType} is not supported");
            }
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 50);
            
            _logger.LogInformation("Cleaning and processing content with AI");
            var processedContent = await CleanTranscriptAsync(rawContent, contentType ?? "text");
            
            await UpdateJobStatus(job, ProcessingJobStatus.Processing, 80);
            
            if (project.Transcript != null)
            {
                project.Transcript.UpdateRawContent(rawContent);
                project.Transcript.SetProcessedContent(processedContent, processedContent);
            }
            else
            {
                var transcript = Transcript.Create(
                    projectId: projectId,
                    title: project.Title,
                    rawContent: rawContent,
                    sourceType: contentType,
                    sourceUrl: contentUrl,
                    fileName: project.FileName,
                    filePath: project.FilePath
                );
                
                transcript.SetProcessedContent(processedContent, processedContent);
                _context.Transcripts.Add(transcript);
            }
            
            project.TransitionTo(ProjectStage.InsightsReady);
            
            await _context.SaveChangesAsync();
            
            await CompleteJob(job, 1);
            
            _logger.LogInformation("Content processing completed for project {ProjectId}", projectId);
            
            if (project.WorkflowConfig?.AutoApproveInsights == true)
            {
                BackgroundJob.Enqueue<InsightExtractionJob>(job => job.ExtractInsights(projectId));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing content for project {ProjectId}", projectId);
            await FailJob(job, ex.Message);
            throw;
        }
    }

    [Queue("default")]
    public async Task ProcessBatchContent(List<(Guid ProjectId, string ContentUrl, string ContentType)> contentItems)
    {
        _logger.LogInformation("Processing batch of {Count} content items", contentItems.Count);
        
        var successCount = 0;
        var failedItems = new List<string>();
        
        foreach (var (projectId, contentUrl, contentType) in contentItems)
        {
            try
            {
                await ProcessContent(projectId, contentUrl, contentType);
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process content for project {ProjectId}", projectId);
                failedItems.Add(projectId.ToString());
            }
        }
        
        _logger.LogInformation("Batch processing completed. Success: {Success}, Failed: {Failed}",
            successCount, failedItems.Count);
        
        if (failedItems.Any())
        {
            throw new Exception($"Failed to process {failedItems.Count} items: {string.Join(", ", failedItems)}");
        }
    }

    [Queue("default")]
    public async Task ReprocessContent(Guid projectId, bool preserveEdits = true)
    {
        _logger.LogInformation("Reprocessing content for project {ProjectId}, preserve edits: {PreserveEdits}",
            projectId, preserveEdits);
        
        var project = await _context.ContentProjects
            .Include(p => p.Transcript)
            .FirstOrDefaultAsync(p => p.Id == projectId);
        
        if (project?.Transcript == null)
        {
            throw new Exception($"Project {projectId} or its transcript not found");
        }
        
        var originalProcessed = project.Transcript.ProcessedContent;
        var rawContent = project.Transcript.RawContent;
        
        if (string.IsNullOrEmpty(rawContent))
        {
            throw new Exception("No raw content available for reprocessing");
        }
        
        var newProcessedContent = await CleanTranscriptAsync(rawContent, "text");
        
        if (preserveEdits && !string.IsNullOrEmpty(originalProcessed))
        {
            newProcessedContent = await MergeContentEdits(originalProcessed, newProcessedContent);
        }
        
        project.Transcript.SetProcessedContent(newProcessedContent, null);
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Content reprocessing completed for project {ProjectId}", projectId);
    }

    private async Task<string> FetchTextContent(string url)
    {
        using var httpClient = new HttpClient();
        return await httpClient.GetStringAsync(url);
    }

    private async Task<string> ProcessDocumentContent(string url)
    {
        _logger.LogInformation("Processing document from URL: {Url}", url);
        return await Task.FromResult($"Document content from {url}");
    }

    private async Task<string> MergeContentEdits(string original, string newContent)
    {
        return await Task.FromResult(newContent);
    }

    private async Task<ProjectProcessingJob> CreateProcessingJob(Guid projectId, ProcessingJobType jobType)
    {
        var job = new ProjectProcessingJob
        {
            ProjectId = projectId,
            JobType = jobType,
            Status = ProcessingJobStatus.Queued,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _context.ProjectProcessingJobs.Add(job);
        await _context.SaveChangesAsync();
        
        return job;
    }

    private async Task UpdateJobStatus(ProjectProcessingJob job, ProcessingJobStatus status, int progress)
    {
        job.Status = status;
        job.Progress = progress;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (status == ProcessingJobStatus.Processing && job.StartedAt == null)
        {
            job.StartedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
    }

    private async Task CompleteJob(ProjectProcessingJob job, int resultCount)
    {
        job.Status = ProcessingJobStatus.Completed;
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
        job.Status = ProcessingJobStatus.Failed;
        job.ErrorMessage = errorMessage;
        job.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
    }
    
    private async Task<string> TranscribeAudioAsync(string audioUrl)
    {
        _logger.LogInformation("Transcribing audio from URL: {Url}", audioUrl);
        
        var request = new RestRequest("listen", RestSharp.Method.Post);
        request.AddHeader("Authorization", $"Token {_deepgramApiKey}");
        request.AddHeader("Content-Type", "application/json");
        
        var body = new
        {
            url = audioUrl
        };
        
        request.AddJsonBody(body);
        
        var response = await _deepgramClient.ExecuteAsync(request);
        
        if (!response.IsSuccessful)
        {
            _logger.LogError("Deepgram transcription failed: {Error}", response.ErrorMessage);
            throw new Exception($"Transcription failed: {response.ErrorMessage}");
        }
        
        var result = JsonSerializer.Deserialize<DeepgramResponse>(response.Content!);
        var transcript = result?.Results?.Channels?.FirstOrDefault()?.Alternatives?.FirstOrDefault()?.Transcript;
        
        if (string.IsNullOrEmpty(transcript))
        {
            throw new Exception("No transcript received from Deepgram");
        }
        
        _logger.LogInformation("Successfully transcribed audio, length: {Length} characters", transcript.Length);
        return transcript;
    }
    
    private async Task<string> CleanTranscriptAsync(string rawContent, string sourceType)
    {
        _logger.LogInformation("Cleaning transcript with AI");
        
        var prompt = $@"
Clean and format the following transcript. Remove filler words, fix grammar, 
add proper punctuation, and organize into clear paragraphs. Maintain the original 
meaning and key points while making it more readable.

Source Type: {sourceType}
Transcript:
{rawContent}

Cleaned transcript:";

        try
        {
            var response = await _aiModel.GenerateContent(prompt);
            var cleanedContent = response.Text ?? rawContent;
            return cleanedContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clean transcript with AI, using raw content");
            return rawContent;
        }
    }
}

// Internal classes for Deepgram response
internal class DeepgramResponse
{
    public DeepgramResults? Results { get; set; }
}

internal class DeepgramResults
{
    public List<DeepgramChannel>? Channels { get; set; }
}

internal class DeepgramChannel
{
    public List<DeepgramAlternative>? Alternatives { get; set; }
}

internal class DeepgramAlternative
{
    public string Transcript { get; set; } = string.Empty;
    public float Confidence { get; set; }
}