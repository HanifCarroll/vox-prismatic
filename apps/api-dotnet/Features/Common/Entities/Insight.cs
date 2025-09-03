using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class Insight
{
    [Key]
    public Guid Id { get; private set; }
    
    [Required]
    public Guid ProjectId { get; private set; }
    public virtual ContentProject Project { get; private set; } = null!;
    public virtual ContentProject ContentProject => Project;
    
    [Required]
    public Guid TranscriptId { get; private set; }
    public virtual Transcript? Transcript { get; private set; }
    
    [Required]
    [MaxLength(500)]
    public string Title { get; private set; }
    
    [Required]
    public string Summary { get; private set; }
    
    [Required]
    public string Content { get; private set; }
    
    [Required]
    public string VerbatimQuote { get; private set; }
    
    [Required]
    [MaxLength(100)]
    public string Category { get; private set; }
    
    [Required]
    [MaxLength(50)]
    public string PostType { get; private set; }
    
    [MaxLength(50)]
    public string Type { get; private set; }
    
    public string? Tags { get; private set; }
    
    public int UrgencyScore { get; private set; }
    public int RelatabilityScore { get; private set; }
    public int SpecificityScore { get; private set; }
    public int AuthorityScore { get; private set; }
    public int TotalScore { get; private set; }
    public float? OverallScore { get; private set; }
    
    public static class Scores
    {
        public const string Urgency = "urgency";
        public const string Relatability = "relatability";
        public const string Specificity = "specificity";
        public const string Authority = "authority";
    }
    
    public InsightStatus Status { get; private set; }
    
    public int? ProcessingDurationMs { get; private set; }
    public int? EstimatedTokens { get; private set; }
    public float? EstimatedCost { get; private set; }
    
    public string? ReviewedBy { get; private set; }
    public DateTime? ReviewedAt { get; private set; }
    public string? RejectionReason { get; private set; }
    
    public string? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    
    public string? ArchivedBy { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public string? ArchivedReason { get; private set; }
    
    public string? FailureReason { get; private set; }
    public DateTime? FailedAt { get; private set; }
    public int RetryCount { get; private set; }
    
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    
    public bool IsApproved => Status == InsightStatus.Approved || ApprovedAt.HasValue;
    public bool IsReviewed => Status == InsightStatus.Approved || Status == InsightStatus.Rejected;
    
    public virtual ICollection<Post> Posts { get; private set; } = new List<Post>();
    
    // Private constructor for EF Core
    private Insight()
    {
        Id = Guid.NewGuid();
        Title = string.Empty;
        Summary = string.Empty;
        Content = string.Empty;
        VerbatimQuote = string.Empty;
        Category = string.Empty;
        PostType = string.Empty;
        Type = string.Empty;
        Status = InsightStatus.Draft;
        UrgencyScore = 0;
        RelatabilityScore = 0;
        SpecificityScore = 0;
        AuthorityScore = 0;
        TotalScore = 0;
        RetryCount = 0;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
        Posts = new List<Post>();
    }
    
    // Private constructor for factory method
    private Insight(
        Guid projectId,
        Guid transcriptId,
        string title,
        string summary,
        string content,
        string verbatimQuote,
        string category,
        string postType,
        string? tags = null,
        int urgencyScore = 0,
        int relatabilityScore = 0,
        int specificityScore = 0,
        int authorityScore = 0) : this()
    {
        ProjectId = projectId;
        TranscriptId = transcriptId;
        Title = title;
        Summary = summary;
        Content = content;
        VerbatimQuote = verbatimQuote;
        Category = category;
        PostType = postType;
        Tags = tags;
        UrgencyScore = urgencyScore;
        RelatabilityScore = relatabilityScore;
        SpecificityScore = specificityScore;
        AuthorityScore = authorityScore;
        CalculateTotalScore();
    }
    
    // Factory method for creating new insights
    public static Insight Create(
        Guid projectId,
        Guid transcriptId,
        string title,
        string summary,
        string content,
        string? verbatimQuote = null,
        string category = "general",
        string postType = "insight",
        string? tags = null,
        int urgencyScore = 0,
        int relatabilityScore = 0,
        int specificityScore = 0,
        int authorityScore = 0)
    {
        if (projectId == Guid.Empty)
            throw new ArgumentException("Project ID is required", nameof(projectId));
        
        if (transcriptId == Guid.Empty)
            throw new ArgumentException("Transcript ID is required", nameof(transcriptId));
        
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required", nameof(title));
        
        if (title.Length > 500)
            throw new ArgumentException("Title must not exceed 500 characters", nameof(title));
        
        if (string.IsNullOrWhiteSpace(summary))
            throw new ArgumentException("Summary is required", nameof(summary));
        
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Content is required", nameof(content));
        
        if (category.Length > 100)
            throw new ArgumentException("Category must not exceed 100 characters", nameof(category));
        
        if (postType.Length > 50)
            throw new ArgumentException("PostType must not exceed 50 characters", nameof(postType));
        
        return new Insight(
            projectId,
            transcriptId,
            title,
            summary,
            content,
            verbatimQuote ?? string.Empty,
            category,
            postType,
            tags,
            urgencyScore,
            relatabilityScore,
            specificityScore,
            authorityScore
        );
    }
    
    // Domain methods
    public void Approve(string approvedBy)
    {
        if (IsApproved)
            throw new InvalidOperationException($"Insight {Id} is already approved");
        
        Status = InsightStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;
        ReviewedAt = DateTime.UtcNow;
        ReviewedBy = approvedBy;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Reject(string rejectedBy, string reason)
    {
        if (Status == InsightStatus.Rejected)
            throw new InvalidOperationException($"Insight {Id} is already rejected");
        
        Status = InsightStatus.Rejected;
        ReviewedBy = rejectedBy;
        ReviewedAt = DateTime.UtcNow;
        RejectionReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Archive(string archivedBy, string reason)
    {
        ArchivedBy = archivedBy;
        ArchivedAt = DateTime.UtcNow;
        ArchivedReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void CalculateTotalScore()
    {
        TotalScore = UrgencyScore + RelatabilityScore + SpecificityScore + AuthorityScore;
        OverallScore = TotalScore / 4.0f;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateScores(int urgencyScore, int relatabilityScore, int specificityScore, int authorityScore)
    {
        UrgencyScore = urgencyScore;
        RelatabilityScore = relatabilityScore;
        SpecificityScore = specificityScore;
        AuthorityScore = authorityScore;
        CalculateTotalScore();
    }
    
    public void SetProcessingMetrics(int? durationMs, int? estimatedTokens, float? estimatedCost)
    {
        ProcessingDurationMs = durationMs;
        EstimatedTokens = estimatedTokens;
        EstimatedCost = estimatedCost;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string failureReason)
    {
        FailureReason = failureReason;
        FailedAt = DateTime.UtcNow;
        RetryCount++;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class InsightScores
{
    public int Urgency { get; set; }
    public int Relatability { get; set; }
    public int Specificity { get; set; }
    public int Authority { get; set; }
}