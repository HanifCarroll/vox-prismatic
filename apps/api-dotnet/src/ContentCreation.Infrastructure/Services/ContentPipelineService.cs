using ContentCreation.Core.DTOs.AI;
using ContentCreation.Core.DTOs.Pipeline;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.Entities;
using ContentCreation.Core.Enums;
using ContentCreation.Core.Interfaces;
using ContentCreation.Infrastructure.Data;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace ContentCreation.Infrastructure.Services;

public class ContentPipelineService : IContentPipelineService
{
    private readonly ILogger<ContentPipelineService> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IAIService _aiService;
    private readonly IContentProjectService _projectService;
    private readonly ITranscriptService _transcriptService;
    private readonly IInsightService _insightService;
    private readonly IPostService _postService;
    private readonly IMemoryCache _cache;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IProjectProgressHub? _progressHub; // Optional progress hub

    // Cache keys
    private const string PIPELINE_STATUS_KEY = "pipeline_status_{0}";
    private const string PIPELINE_RESULT_KEY = "pipeline_result_{0}";
    private const string ACTIVE_PIPELINES_KEY = "active_pipelines";

    public ContentPipelineService(
        ILogger<ContentPipelineService> logger,
        ApplicationDbContext context,
        IAIService aiService,
        IContentProjectService projectService,
        ITranscriptService transcriptService,
        IInsightService insightService,
        IPostService postService,
        IMemoryCache cache,
        IBackgroundJobClient backgroundJobClient,
        IProjectProgressHub? progressHub = null)
    {
        _logger = logger;
        _context = context;
        _aiService = aiService;
        _projectService = projectService;
        _transcriptService = transcriptService;
        _insightService = insightService;
        _postService = postService;
        _cache = cache;
        _backgroundJobClient = backgroundJobClient;
        _progressHub = progressHub;
    }

    public async Task<string> StartPipelineAsync(StartPipelineDto request)
    {
        _logger.LogInformation("Starting pipeline for project {ProjectId}", request.ProjectId);

        // Create initial status
        var status = new PipelineStatusDto
        {
            ProjectId = request.ProjectId,
            JobId = Guid.NewGuid().ToString(),
            CurrentStage = PipelineStage.TranscriptReceived,
            Status = PipelineStatus.InProgress,
            ProgressPercentage = 0,
            CurrentStepMessage = "Pipeline started",
            StartedAt = DateTime.UtcNow
        };

        // Cache the status
        _cache.Set(string.Format(PIPELINE_STATUS_KEY, request.ProjectId), status, TimeSpan.FromHours(24));

        // Update active pipelines list
        var activePipelines = _cache.Get<List<Guid>>(ACTIVE_PIPELINES_KEY) ?? new List<Guid>();
        if (!activePipelines.Contains(request.ProjectId))
        {
            activePipelines.Add(request.ProjectId);
            _cache.Set(ACTIVE_PIPELINES_KEY, activePipelines, TimeSpan.FromHours(24));
        }

        // Queue the background job
        var jobId = _backgroundJobClient.Enqueue(() => ProcessPipelineAsync(request.ProjectId));
        status.JobId = jobId;

        // Update project lifecycle stage
        await _projectService.UpdateLifecycleStageAsync(request.ProjectId.ToString(), ProjectLifecycleStage.ProcessingContent.ToString());

        return jobId;
    }

    public async Task ProcessPipelineAsync(Guid projectId)
    {
        var startTime = DateTime.UtcNow;
        var status = GetCachedStatus(projectId);
        var completedSteps = new List<PipelineStepResult>();

        try
        {
            // Step 1: Clean Transcript
            UpdatePipelineStatus(projectId, PipelineStage.CleaningTranscript, "Cleaning transcript...", 10);
            var cleanResult = await ProcessTranscriptCleaning(projectId);
            completedSteps.Add(new PipelineStepResult
            {
                Stage = PipelineStage.CleaningTranscript,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow.AddSeconds(2),
                Success = true,
                Message = "Transcript cleaned successfully",
                Data = new Dictionary<string, object> { ["wordCount"] = cleanResult.WordCount }
            });

            // Step 2: Extract Insights
            UpdatePipelineStatus(projectId, PipelineStage.ExtractingInsights, "Extracting insights...", 30);
            var insightsResult = await ProcessInsightExtraction(projectId, cleanResult.CleanedContent);
            completedSteps.Add(new PipelineStepResult
            {
                Stage = PipelineStage.ExtractingInsights,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow.AddSeconds(3),
                Success = true,
                Message = $"Extracted {insightsResult.TotalExtracted} insights",
                Data = new Dictionary<string, object> { ["count"] = insightsResult.TotalExtracted }
            });

            // Step 3: Review Insights (if not auto-approved)
            var autoApproveInsights = _cache.Get<bool>($"auto_approve_insights_{projectId}");
            if (!autoApproveInsights)
            {
                UpdatePipelineStatus(projectId, PipelineStage.InsightsReview, "Waiting for insight review...", 40);
                await WaitForReview(projectId, PipelineStage.InsightsReview);
            }
            else
            {
                await AutoApproveInsights(projectId);
            }
            completedSteps.Add(new PipelineStepResult
            {
                Stage = PipelineStage.InsightsReview,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow.AddSeconds(1),
                Success = true,
                Message = autoApproveInsights ? "Insights auto-approved" : "Insights reviewed and approved"
            });

            // Step 4: Generate Posts
            UpdatePipelineStatus(projectId, PipelineStage.GeneratingPosts, "Generating posts...", 60);
            var postsResult = await ProcessPostGeneration(projectId, insightsResult.Insights);
            completedSteps.Add(new PipelineStepResult
            {
                Stage = PipelineStage.GeneratingPosts,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow.AddSeconds(3),
                Success = true,
                Message = $"Generated {postsResult.TotalGenerated} posts",
                Data = new Dictionary<string, object> { ["count"] = postsResult.TotalGenerated }
            });

            // Step 5: Review Posts (if not auto-approved)
            var autoApprovePosts = _cache.Get<bool>($"auto_approve_posts_{projectId}");
            if (!autoApprovePosts)
            {
                UpdatePipelineStatus(projectId, PipelineStage.PostsReview, "Waiting for post review...", 80);
                await WaitForReview(projectId, PipelineStage.PostsReview);
            }
            else
            {
                await AutoApprovePosts(projectId);
            }
            completedSteps.Add(new PipelineStepResult
            {
                Stage = PipelineStage.PostsReview,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow.AddSeconds(1),
                Success = true,
                Message = autoApprovePosts ? "Posts auto-approved" : "Posts reviewed and approved"
            });

            // Step 6: Schedule Posts
            UpdatePipelineStatus(projectId, PipelineStage.Scheduling, "Scheduling posts...", 90);
            var scheduledCount = await SchedulePosts(projectId);
            completedSteps.Add(new PipelineStepResult
            {
                Stage = PipelineStage.Scheduling,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow.AddSeconds(1),
                Success = true,
                Message = $"Scheduled {scheduledCount} posts",
                Data = new Dictionary<string, object> { ["count"] = scheduledCount }
            });

            // Mark as completed
            UpdatePipelineStatus(projectId, PipelineStage.Completed, "Pipeline completed successfully", 100);
            await _projectService.UpdateLifecycleStageAsync(projectId.ToString(), ProjectLifecycleStage.Scheduled.ToString());

            // Save final result
            var result = new PipelineResultDto
            {
                ProjectId = projectId,
                Success = true,
                FinalStage = PipelineStage.Completed,
                TotalDuration = DateTime.UtcNow - startTime,
                InsightsGenerated = insightsResult.TotalExtracted,
                PostsGenerated = postsResult.TotalGenerated,
                PostsScheduled = scheduledCount,
                Steps = completedSteps
            };
            _cache.Set(string.Format(PIPELINE_RESULT_KEY, projectId), result, TimeSpan.FromDays(7));

            _logger.LogInformation("Pipeline completed successfully for project {ProjectId}", projectId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Pipeline failed for project {ProjectId}", projectId);
            
            UpdatePipelineStatus(projectId, PipelineStage.Failed, $"Pipeline failed: {ex.Message}", 0);
            await _projectService.UpdateLifecycleStageAsync(projectId.ToString(), ProjectLifecycleStage.RawContent.ToString());

            var result = new PipelineResultDto
            {
                ProjectId = projectId,
                Success = false,
                FinalStage = status?.CurrentStage ?? PipelineStage.Failed,
                TotalDuration = DateTime.UtcNow - startTime,
                Steps = completedSteps,
                Metadata = new Dictionary<string, object> { ["error"] = ex.Message }
            };
            _cache.Set(string.Format(PIPELINE_RESULT_KEY, projectId), result, TimeSpan.FromDays(7));

            throw;
        }
        finally
        {
            // Remove from active pipelines
            var activePipelines = _cache.Get<List<Guid>>(ACTIVE_PIPELINES_KEY) ?? new List<Guid>();
            activePipelines.Remove(projectId);
            _cache.Set(ACTIVE_PIPELINES_KEY, activePipelines, TimeSpan.FromHours(24));
        }
    }

    public async Task<PipelineStatusDto> GetPipelineStatusAsync(Guid projectId)
    {
        var status = GetCachedStatus(projectId);
        if (status == null)
        {
            // Check if there's a completed result
            var result = await GetPipelineResultAsync(projectId);
            if (result != null)
            {
                return new PipelineStatusDto
                {
                    ProjectId = projectId,
                    CurrentStage = result.FinalStage,
                    Status = result.Success ? PipelineStatus.Completed : PipelineStatus.Failed,
                    ProgressPercentage = 100,
                    CompletedSteps = result.Steps
                };
            }

            return new PipelineStatusDto
            {
                ProjectId = projectId,
                CurrentStage = PipelineStage.Idle,
                Status = PipelineStatus.NotStarted,
                ProgressPercentage = 0
            };
        }
        return status;
    }

    public Task<PipelineResultDto?> GetPipelineResultAsync(Guid projectId)
    {
        var result = _cache.Get<PipelineResultDto?>(string.Format(PIPELINE_RESULT_KEY, projectId));
        return Task.FromResult(result);
    }

    public async Task<bool> SubmitReviewAsync(PipelineReviewDto review)
    {
        _logger.LogInformation("Processing review for project {ProjectId} at stage {Stage}", 
            review.ProjectId, review.Stage);

        // Store the review decision
        _cache.Set($"review_{review.ProjectId}_{review.Stage}", review, TimeSpan.FromHours(1));

        // Apply the review decision
        if (review.Decision == ReviewDecision.Approved)
        {
            if (review.Stage == PipelineStage.InsightsReview)
            {
                await ApproveInsights(review.ProjectId);
            }
            else if (review.Stage == PipelineStage.PostsReview)
            {
                await ApprovePosts(review.ProjectId);
            }
        }
        else if (review.Decision == ReviewDecision.Rejected)
        {
            // Handle rejection - could restart from previous stage or cancel
            await CancelPipelineAsync(new CancelPipelineDto 
            { 
                ProjectId = review.ProjectId, 
                Reason = $"Rejected at {review.Stage}: {review.Feedback}" 
            });
        }

        return true;
    }

    public Task<bool> CancelPipelineAsync(CancelPipelineDto request)
    {
        _logger.LogInformation("Cancelling pipeline for project {ProjectId}: {Reason}", 
            request.ProjectId, request.Reason);

        UpdatePipelineStatus(request.ProjectId, PipelineStage.Cancelled, 
            request.Reason ?? "Pipeline cancelled by user", 0);

        // Remove from active pipelines
        var activePipelines = _cache.Get<List<Guid>>(ACTIVE_PIPELINES_KEY) ?? new List<Guid>();
        activePipelines.Remove(request.ProjectId);
        _cache.Set(ACTIVE_PIPELINES_KEY, activePipelines, TimeSpan.FromHours(24));

        return Task.FromResult(true);
    }

    public async Task<string> RetryPipelineAsync(RetryPipelineDto request)
    {
        _logger.LogInformation("Retrying pipeline for project {ProjectId} from stage {Stage}", 
            request.ProjectId, request.FromStage);

        // Clear existing status and result
        _cache.Remove(string.Format(PIPELINE_STATUS_KEY, request.ProjectId));
        _cache.Remove(string.Format(PIPELINE_RESULT_KEY, request.ProjectId));

        // Start new pipeline
        return await StartPipelineAsync(new StartPipelineDto { ProjectId = request.ProjectId });
    }

    public async Task<List<PipelineStatusDto>> GetActivePipelinesAsync()
    {
        var activePipelineIds = _cache.Get<List<Guid>>(ACTIVE_PIPELINES_KEY) ?? new List<Guid>();
        var statuses = new List<PipelineStatusDto>();

        foreach (var id in activePipelineIds)
        {
            var status = await GetPipelineStatusAsync(id);
            if (status != null && status.Status == PipelineStatus.InProgress)
            {
                statuses.Add(status);
            }
        }

        return statuses;
    }

    #region Private Helper Methods

    private PipelineStatusDto? GetCachedStatus(Guid projectId)
    {
        return _cache.Get<PipelineStatusDto?>(string.Format(PIPELINE_STATUS_KEY, projectId));
    }

    private void UpdatePipelineStatus(Guid projectId, PipelineStage stage, string message, int progress)
    {
        var status = GetCachedStatus(projectId) ?? new PipelineStatusDto { ProjectId = projectId };
        
        status.CurrentStage = stage;
        status.CurrentStepMessage = message;
        status.ProgressPercentage = progress;
        status.Status = stage switch
        {
            PipelineStage.Completed => PipelineStatus.Completed,
            PipelineStage.Failed => PipelineStatus.Failed,
            PipelineStage.Cancelled => PipelineStatus.Cancelled,
            PipelineStage.InsightsReview or PipelineStage.PostsReview => PipelineStatus.WaitingForReview,
            _ => PipelineStatus.InProgress
        };

        _cache.Set(string.Format(PIPELINE_STATUS_KEY, projectId), status, TimeSpan.FromHours(24));
        
        // TODO: Send real-time update via SignalR here
    }

    private async Task<CleanTranscriptResult> ProcessTranscriptCleaning(Guid projectId)
    {
        var transcript = await _context.Transcripts
            .FirstOrDefaultAsync(t => t.ProjectId == projectId.ToString());

        if (transcript == null)
            throw new InvalidOperationException($"No transcript found for project {projectId}");

        var cleanRequest = new CleanTranscriptRequest
        {
            RawContent = transcript.RawContent,
            SourceType = transcript.SourceType
        };

        var result = await _aiService.CleanTranscriptAsync(cleanRequest);
        
        // Update transcript with cleaned content
        transcript.CleanedContent = result.CleanedContent;
        transcript.WordCount = result.WordCount;
        transcript.Status = "cleaned";
        await _context.SaveChangesAsync();

        return result;
    }

    private async Task<ExtractInsightsResult> ProcessInsightExtraction(Guid projectId, string cleanedContent)
    {
        var extractRequest = new ExtractInsightsRequest
        {
            Content = cleanedContent,
            MaxInsights = 5
        };

        var result = await _aiService.ExtractInsightsAsync(extractRequest);

        // Save insights to database
        foreach (var insight in result.Insights)
        {
            await _insightService.CreateAsync(new Core.DTOs.Insights.CreateInsightDto
            {
                ProjectId = projectId.ToString(),
                Title = insight.Title,
                Content = insight.Content,
                Category = insight.Category,
                Tags = insight.Tags,
                Status = "draft"
            });
        }

        return result;
    }

    private async Task<GeneratePostsResult> ProcessPostGeneration(Guid projectId, List<ExtractedInsight> insights)
    {
        var platforms = new List<string> { "LinkedIn", "X" }; // TODO: Get from project settings
        
        var generateRequest = new GeneratePostsRequest
        {
            Insights = insights,
            Platforms = platforms
        };

        var result = await _aiService.GeneratePostsAsync(generateRequest);

        // Save posts to database
        foreach (var post in result.Posts)
        {
            await _postService.CreateAsync(new Core.DTOs.Posts.CreatePostDto
            {
                ProjectId = projectId.ToString(),
                Platform = Enum.Parse<Platform>(post.Platform, true),
                Title = post.Title ?? "Untitled Post",
                Content = post.Content,
                Hashtags = post.Hashtags,
                Status = "draft"
            });
        }

        return result;
    }

    private async Task WaitForReview(Guid projectId, PipelineStage stage)
    {
        var timeout = TimeSpan.FromHours(24);
        var startTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < timeout)
        {
            var review = _cache.Get<PipelineReviewDto>($"review_{projectId}_{stage}");
            if (review != null)
            {
                return; // Review submitted
            }

            await Task.Delay(5000); // Check every 5 seconds
        }

        throw new TimeoutException($"Review timeout for project {projectId} at stage {stage}");
    }

    private async Task AutoApproveInsights(Guid projectId)
    {
        var insights = await _context.Insights
            .Where(i => i.ProjectId == projectId.ToString() && i.Status == "draft")
            .ToListAsync();

        foreach (var insight in insights)
        {
            insight.Status = "approved";
        }
        await _context.SaveChangesAsync();
    }

    private async Task ApproveInsights(Guid projectId)
    {
        await AutoApproveInsights(projectId);
        await _projectService.UpdateLifecycleStageAsync(projectId.ToString(), ProjectLifecycleStage.InsightsApproved.ToString());
    }

    private async Task AutoApprovePosts(Guid projectId)
    {
        var posts = await _context.Posts
            .Where(p => p.ProjectId == projectId.ToString() && p.Status == "draft")
            .ToListAsync();

        foreach (var post in posts)
        {
            post.Status = "approved";
        }
        await _context.SaveChangesAsync();
    }

    private async Task ApprovePosts(Guid projectId)
    {
        await AutoApprovePosts(projectId);
        await _projectService.UpdateLifecycleStageAsync(projectId.ToString(), ProjectLifecycleStage.PostsApproved.ToString());
    }

    private async Task<int> SchedulePosts(Guid projectId)
    {
        var posts = await _context.Posts
            .Where(p => p.ProjectId == projectId.ToString() && p.Status == "approved")
            .ToListAsync();

        var scheduledCount = 0;
        var scheduleTime = DateTime.UtcNow.AddHours(1); // Start scheduling 1 hour from now

        foreach (var post in posts)
        {
            post.Status = "scheduled";
            
            // Create a ScheduledPost entity for each post
            var scheduledPost = new ScheduledPost
            {
                PostId = Guid.Parse(post.Id),
                ProjectId = projectId,
                Platform = post.Platform,
                ScheduledFor = scheduleTime,
                Status = "Pending"
            };
            
            _context.ScheduledPosts.Add(scheduledPost);
            scheduledCount++;
            
            // Space posts out by 4 hours
            scheduleTime = scheduleTime.AddHours(4);
        }

        await _context.SaveChangesAsync();
        return scheduledCount;
    }

    #endregion
}