using System.ComponentModel.DataAnnotations;
using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

public class Insight
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ProjectId { get; set; }
    public virtual ContentProject Project { get; set; } = null!;
    public virtual ContentProject ContentProject => Project;
    
    [Required]
    public Guid TranscriptId { get; set; }
    public virtual Transcript? Transcript { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Summary { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public string VerbatimQuote { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string PostType { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;
    
    public string? Tags { get; set; }
    
    public int UrgencyScore { get; set; } = 0;
    public int RelatabilityScore { get; set; } = 0;
    public int SpecificityScore { get; set; } = 0;
    public int AuthorityScore { get; set; } = 0;
    public int TotalScore { get; set; } = 0;
    public float? OverallScore { get; set; }
    
    public static class Scores
    {
        public const string Urgency = "urgency";
        public const string Relatability = "relatability";
        public const string Specificity = "specificity";
        public const string Authority = "authority";
    }
    
    public InsightStatus Status { get; set; } = InsightStatus.Draft;
    
    public int? ProcessingDurationMs { get; set; }
    public int? EstimatedTokens { get; set; }
    public float? EstimatedCost { get; set; }
    
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    
    public string? ArchivedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedReason { get; set; }
    
    public string? FailureReason { get; set; }
    public DateTime? FailedAt { get; set; }
    public int RetryCount { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsApproved => Status == InsightStatus.Approved || ApprovedAt.HasValue;
    public bool IsReviewed => Status == InsightStatus.Approved || Status == InsightStatus.Rejected;
    
    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
    
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
    }
}

public class InsightScores
{
    public int Urgency { get; set; }
    public int Relatability { get; set; }
    public int Specificity { get; set; }
    public int Authority { get; set; }
}