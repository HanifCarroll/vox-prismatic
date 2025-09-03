using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class Transcript
{
    [Key]
    public Guid Id { get; private set; }
    
    [Required]
    public Guid ProjectId { get; private set; }
    public virtual ContentProject Project { get; private set; } = null!;
    public virtual ContentProject ContentProject => Project;
    
    [Required]
    [MaxLength(500)]
    public string Title { get; private set; }
    
    [Required]
    public string RawContent { get; private set; }
    
    public string? CleanedContent { get; private set; }
    
    public string? ProcessedContent { get; private set; }
    
    public DateTime? ProcessedAt { get; private set; }
    
    public TranscriptStatus Status { get; private set; }
    
    [MaxLength(50)]
    public string? SourceType { get; private set; }
    
    [MaxLength(500)]
    public string? SourceUrl { get; private set; }
    
    [MaxLength(255)]
    public string? FileName { get; private set; }
    
    public int? Duration { get; private set; }
    
    public int WordCount { get; private set; }
    
    [MaxLength(500)]
    public string? FilePath { get; private set; }
    
    public string? ErrorMessage { get; private set; }
    
    public DateTime? FailedAt { get; private set; }
    
    public DateTime CreatedAt { get; private set; }
    
    public DateTime UpdatedAt { get; private set; }
    
    public string? QueueJobId { get; private set; }
    
    public int? EstimatedTokens { get; private set; }
    
    public decimal? EstimatedCost { get; private set; }

    public int? ProcessingDurationMs { get; private set; }
    
    public virtual ICollection<Insight> Insights { get; private set; } = new List<Insight>();
    
    // Private constructor for EF Core
    private Transcript()
    {
        Id = Guid.NewGuid();
        Title = string.Empty;
        RawContent = string.Empty;
        Status = TranscriptStatus.Pending;
        WordCount = 0;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        Insights = new List<Insight>();
    }
    
    // Private constructor for factory method
    private Transcript(
        Guid projectId,
        string title,
        string rawContent,
        string? sourceType = null,
        string? sourceUrl = null,
        string? fileName = null,
        string? filePath = null) : this()
    {
        ProjectId = projectId;
        Title = title;
        RawContent = rawContent;
        SourceType = sourceType;
        SourceUrl = sourceUrl;
        FileName = fileName;
        FilePath = filePath;
        WordCount = rawContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
    }
    
    // Factory method for creating new transcripts
    public static Transcript Create(
        Guid projectId,
        string title,
        string rawContent,
        string? sourceType = null,
        string? sourceUrl = null,
        string? fileName = null,
        string? filePath = null)
    {
        if (projectId == Guid.Empty)
            throw new ArgumentException("Project ID is required", nameof(projectId));
        
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required", nameof(title));
        
        if (title.Length > 500)
            throw new ArgumentException("Title must not exceed 500 characters", nameof(title));
        
        if (string.IsNullOrWhiteSpace(rawContent))
            throw new ArgumentException("Raw content is required", nameof(rawContent));
        
        if (sourceType?.Length > 50)
            throw new ArgumentException("Source type must not exceed 50 characters", nameof(sourceType));
        
        if (sourceUrl?.Length > 500)
            throw new ArgumentException("Source URL must not exceed 500 characters", nameof(sourceUrl));
        
        if (fileName?.Length > 255)
            throw new ArgumentException("File name must not exceed 255 characters", nameof(fileName));
        
        if (filePath?.Length > 500)
            throw new ArgumentException("File path must not exceed 500 characters", nameof(filePath));
        
        return new Transcript(projectId, title, rawContent, sourceType, sourceUrl, fileName, filePath);
    }
    
    // Domain methods
    public void StartProcessing()
    {
        if (Status != TranscriptStatus.Pending)
            throw new InvalidOperationException($"Can only start processing transcripts in Pending status, current status is {Status}");
        
        Status = TranscriptStatus.Processing;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetProcessedContent(string processedContent, string? cleanedContent = null)
    {
        if (string.IsNullOrWhiteSpace(processedContent))
            throw new ArgumentException("Processed content cannot be empty", nameof(processedContent));
        
        ProcessedContent = processedContent;
        CleanedContent = cleanedContent ?? processedContent;
        ProcessedAt = DateTime.UtcNow;
        Status = TranscriptStatus.Processed;
        WordCount = processedContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorMessage)
    {
        Status = TranscriptStatus.Failed;
        ErrorMessage = errorMessage;
        FailedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetProcessingMetrics(int? processingDurationMs, int? estimatedTokens, decimal? estimatedCost)
    {
        ProcessingDurationMs = processingDurationMs;
        EstimatedTokens = estimatedTokens;
        EstimatedCost = estimatedCost;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetQueueJobId(string jobId)
    {
        QueueJobId = jobId;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetDuration(int duration)
    {
        Duration = duration;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateRawContent(string rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            throw new ArgumentException("Raw content cannot be empty", nameof(rawContent));
        
        RawContent = rawContent;
        WordCount = rawContent.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        Status = TranscriptStatus.Pending;
        ProcessedContent = null;
        CleanedContent = null;
        ProcessedAt = null;
        UpdatedAt = DateTime.UtcNow;
    }
}