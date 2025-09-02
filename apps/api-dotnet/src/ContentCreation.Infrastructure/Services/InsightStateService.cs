using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using AutoMapper;
using Hangfire;

namespace ContentCreation.Infrastructure.Services;

public class InsightStateService : IInsightStateService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<InsightStateService> _logger;

    public InsightStateService(
        ApplicationDbContext context,
        IMapper mapper,
        IBackgroundJobClient backgroundJobClient,
        ILogger<InsightStateService> logger)
    {
        _context = context;
        _mapper = mapper;
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    public async Task<InsightDto> SubmitForReviewAsync(string id)
    {
        _logger.LogInformation("Submitting insight {InsightId} for review", id);

        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        if (!CanTransition(insight.Status, InsightAction.SubmitForReview))
        {
            throw new InvalidOperationException($"Cannot submit insight for review from status: {insight.Status}");
        }

        insight.Status = "needs_review";
        insight.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Insight {InsightId} submitted for review", id);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<InsightDto> ApproveInsightAsync(string id, string approvedBy, int? score = null)
    {
        _logger.LogInformation("Approving insight {InsightId}", id);

        var insight = await _context.Insights
            .Include(i => i.ContentProject)
            .FirstOrDefaultAsync(i => i.Id == id);
            
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        if (!CanTransition(insight.Status, InsightAction.Approve))
        {
            throw new InvalidOperationException($"Cannot approve insight from status: {insight.Status}");
        }

        insight.Status = "approved";
        insight.ReviewedBy = approvedBy;
        insight.ReviewedAt = DateTime.UtcNow;
        
        if (score.HasValue)
        {
            insight.OverallScore = score.Value;
        }

        insight.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Trigger post generation for approved insights
        var jobId = _backgroundJobClient.Enqueue(() => TriggerPostGeneration(id));
        _logger.LogInformation("Scheduled post generation job {JobId} for insight {InsightId}", jobId, id);

        // Update project lifecycle if needed
        await UpdateProjectLifecycleAsync(insight.ProjectId);

        _logger.LogInformation("Insight {InsightId} approved by {ApprovedBy}", id, approvedBy);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<InsightDto> RejectInsightAsync(string id, string reviewedBy, string reason)
    {
        _logger.LogInformation("Rejecting insight {InsightId}", id);

        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        if (!CanTransition(insight.Status, InsightAction.Reject))
        {
            throw new InvalidOperationException($"Cannot reject insight from status: {insight.Status}");
        }

        insight.Status = "rejected";
        insight.ReviewedBy = reviewedBy;
        insight.ReviewedAt = DateTime.UtcNow;
        insight.RejectionReason = reason;
        insight.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Insight {InsightId} rejected by {ReviewedBy}", id, reviewedBy);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<InsightDto> ArchiveInsightAsync(string id, string reason)
    {
        _logger.LogInformation("Archiving insight {InsightId}", id);

        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        if (!CanTransition(insight.Status, InsightAction.Archive))
        {
            throw new InvalidOperationException($"Cannot archive insight from status: {insight.Status}");
        }

        insight.Status = "archived";
        insight.RejectionReason = reason; // Using RejectionReason field to store archive reason
        insight.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Insight {InsightId} archived", id);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<InsightDto> RestoreInsightAsync(string id)
    {
        _logger.LogInformation("Restoring insight {InsightId}", id);

        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        if (!CanTransition(insight.Status, InsightAction.Restore))
        {
            throw new InvalidOperationException($"Cannot restore insight from status: {insight.Status}");
        }

        insight.Status = "draft";
        insight.RejectionReason = null;
        insight.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Insight {InsightId} restored", id);
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<AvailableActionsDto> GetAvailableActionsAsync(string id)
    {
        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            throw new KeyNotFoundException($"Insight with ID {id} not found");
        }

        var availableActions = GetAvailableActions(insight.Status);

        return new AvailableActionsDto
        {
            CurrentState = insight.Status,
            AvailableActions = availableActions
        };
    }

    public async Task<bool> CanTransitionAsync(string id, InsightAction action)
    {
        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            return false;
        }

        return CanTransition(insight.Status, action);
    }

    private bool CanTransition(string currentStatus, InsightAction action)
    {
        return (currentStatus, action) switch
        {
            ("draft", InsightAction.SubmitForReview) => true,
            ("draft", InsightAction.Archive) => true,
            ("draft", InsightAction.Delete) => true,
            
            ("needs_review", InsightAction.Approve) => true,
            ("needs_review", InsightAction.Reject) => true,
            ("needs_review", InsightAction.Archive) => true,
            
            ("approved", InsightAction.Archive) => true,
            
            ("rejected", InsightAction.Archive) => true,
            ("rejected", InsightAction.SubmitForReview) => true,
            
            ("archived", InsightAction.Restore) => true,
            
            _ => false
        };
    }

    private List<string> GetAvailableActions(string currentStatus)
    {
        var actions = new List<string>();

        foreach (InsightAction action in Enum.GetValues(typeof(InsightAction)))
        {
            if (CanTransition(currentStatus, action))
            {
                actions.Add(action.ToString());
            }
        }

        return actions;
    }

    private async Task UpdateProjectLifecycleAsync(string projectId)
    {
        var project = await _context.ContentProjects
            .Include(p => p.Insights)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null) return;

        var approvedInsights = project.Insights.Count(i => i.Status == "approved");
        var totalInsights = project.Insights.Count;

        if (approvedInsights > 0 && project.CurrentStage == Core.Enums.ProjectLifecycleStage.InsightsReady)
        {
            project.CurrentStage = Core.Enums.ProjectLifecycleStage.InsightsApproved;
            project.LastActivityAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Updated project {ProjectId} to InsightsApproved stage", projectId);
        }
    }

    // This method would be executed by Hangfire
    public static void TriggerPostGeneration(string insightId)
    {
        // This would be implemented to trigger post generation
        // For now, it's a placeholder
        Console.WriteLine($"Triggering post generation for insight: {insightId}");
    }
}