using ContentCreation.Api.Features.Common.Enums;

namespace ContentCreation.Api.Features.Common.Entities;

// Project lifecycle events
public class ProjectCreatedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public Guid UserId { get; }
    
    public ProjectCreatedEvent(Guid projectId, Guid userId)
    {
        ProjectId = projectId;
        UserId = userId;
    }
}

public class ProjectStageChangedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public ProjectStage PreviousStage { get; }
    public ProjectStage NewStage { get; }
    public Guid UserId { get; }
    
    public ProjectStageChangedEvent(Guid projectId, ProjectStage previousStage, ProjectStage newStage, Guid userId)
    {
        ProjectId = projectId;
        PreviousStage = previousStage;
        NewStage = newStage;
        UserId = userId;
    }
}

public class ProjectArchivedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public string ArchivedBy { get; }
    public string Reason { get; }
    
    public ProjectArchivedEvent(Guid projectId, string archivedBy, string reason)
    {
        ProjectId = projectId;
        ArchivedBy = archivedBy;
        Reason = reason;
    }
}

public class ProjectRestoredEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public string RestoredBy { get; }
    
    public ProjectRestoredEvent(Guid projectId, string restoredBy)
    {
        ProjectId = projectId;
        RestoredBy = restoredBy;
    }
}

// Insight events
public class InsightApprovedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public Guid InsightId { get; }
    public string ApprovedBy { get; }
    
    public InsightApprovedEvent(Guid projectId, Guid insightId, string approvedBy)
    {
        ProjectId = projectId;
        InsightId = insightId;
        ApprovedBy = approvedBy;
    }
}

public class InsightRejectedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public Guid InsightId { get; }
    public string RejectedBy { get; }
    public string Reason { get; }
    
    public InsightRejectedEvent(Guid projectId, Guid insightId, string rejectedBy, string reason)
    {
        ProjectId = projectId;
        InsightId = insightId;
        RejectedBy = rejectedBy;
        Reason = reason;
    }
}

public class AllInsightsApprovedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public string ApprovedBy { get; }
    public int Count { get; }
    
    public AllInsightsApprovedEvent(Guid projectId, string approvedBy, int count)
    {
        ProjectId = projectId;
        ApprovedBy = approvedBy;
        Count = count;
    }
}

// Post events
public class PostApprovedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public Guid PostId { get; }
    public string ApprovedBy { get; }
    
    public PostApprovedEvent(Guid projectId, Guid postId, string approvedBy)
    {
        ProjectId = projectId;
        PostId = postId;
        ApprovedBy = approvedBy;
    }
}

public class PostRejectedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public Guid PostId { get; }
    public string RejectedBy { get; }
    public string Reason { get; }
    
    public PostRejectedEvent(Guid projectId, Guid postId, string rejectedBy, string reason)
    {
        ProjectId = projectId;
        PostId = postId;
        RejectedBy = rejectedBy;
        Reason = reason;
    }
}

public class AllPostsApprovedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public string ApprovedBy { get; }
    public int Count { get; }
    
    public AllPostsApprovedEvent(Guid projectId, string approvedBy, int count)
    {
        ProjectId = projectId;
        ApprovedBy = approvedBy;
        Count = count;
    }
}

// Processing events
public class ProcessingFailedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public string ErrorMessage { get; }
    
    public ProcessingFailedEvent(Guid projectId, string errorMessage)
    {
        ProjectId = projectId;
        ErrorMessage = errorMessage;
    }
}

public class PublishingFailedEvent : DomainEvent
{
    public Guid ProjectId { get; }
    public string ErrorMessage { get; }
    
    public PublishingFailedEvent(Guid projectId, string errorMessage)
    {
        ProjectId = projectId;
        ErrorMessage = errorMessage;
    }
}