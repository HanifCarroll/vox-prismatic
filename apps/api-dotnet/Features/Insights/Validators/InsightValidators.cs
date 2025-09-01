using FluentValidation;
using ContentCreation.Api.Features.Insights.DTOs;

namespace ContentCreation.Api.Features.Insights.Validators;

public class CreateInsightDtoValidator : AbstractValidator<CreateInsightDto>
{
    public CreateInsightDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MinimumLength(3).WithMessage("Title must be at least 3 characters")
            .MaximumLength(200).WithMessage("Title cannot exceed 200 characters");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Content is required")
            .MinimumLength(10).WithMessage("Content must be at least 10 characters")
            .MaximumLength(5000).WithMessage("Content cannot exceed 5000 characters");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Category is required")
            .Must(BeValidCategory).WithMessage("Invalid category");

        RuleFor(x => x.PostType)
            .NotEmpty().WithMessage("Post type is required")
            .Must(BeValidPostType).WithMessage("Invalid post type");

        RuleFor(x => x.ImpactScore)
            .InclusiveBetween(1, 10).WithMessage("Impact score must be between 1 and 10");

        RuleFor(x => x.ConfidenceScore)
            .InclusiveBetween(1, 10).WithMessage("Confidence score must be between 1 and 10");

        RuleFor(x => x.ActionabilityScore)
            .InclusiveBetween(1, 10).WithMessage("Actionability score must be between 1 and 10");

        RuleFor(x => x.Tags)
            .Must(tags => tags == null || tags.Count <= 10)
            .WithMessage("Cannot have more than 10 tags");

        RuleFor(x => x.Quotes)
            .Must(quotes => quotes == null || quotes.Count <= 5)
            .WithMessage("Cannot have more than 5 quotes");

        RuleFor(x => x.TalkingPoints)
            .Must(points => points == null || points.Count <= 10)
            .WithMessage("Cannot have more than 10 talking points");
    }

    private bool BeValidCategory(string category)
    {
        var validCategories = new[] 
        { 
            "insight", "tip", "trend", "opinion", "news", 
            "case_study", "best_practice", "lesson_learned", "other" 
        };
        return validCategories.Contains(category.ToLower());
    }

    private bool BeValidPostType(string postType)
    {
        var validTypes = new[] 
        { 
            "educational", "inspirational", "promotional", 
            "conversational", "news", "opinion", "how_to" 
        };
        return validTypes.Contains(postType.ToLower());
    }
}

public class UpdateInsightDtoValidator : AbstractValidator<UpdateInsightDto>
{
    public UpdateInsightDtoValidator()
    {
        RuleFor(x => x.Title)
            .MinimumLength(3).WithMessage("Title must be at least 3 characters")
            .MaximumLength(200).WithMessage("Title cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Title));

        RuleFor(x => x.Content)
            .MinimumLength(10).WithMessage("Content must be at least 10 characters")
            .MaximumLength(5000).WithMessage("Content cannot exceed 5000 characters")
            .When(x => !string.IsNullOrEmpty(x.Content));

        RuleFor(x => x.Category)
            .Must(BeValidCategory).WithMessage("Invalid category")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.PostType)
            .Must(BeValidPostType).WithMessage("Invalid post type")
            .When(x => !string.IsNullOrEmpty(x.PostType));

        RuleFor(x => x.Status)
            .Must(BeValidStatus).WithMessage("Invalid status")
            .When(x => !string.IsNullOrEmpty(x.Status));

        RuleFor(x => x.ImpactScore)
            .InclusiveBetween(1, 10).WithMessage("Impact score must be between 1 and 10")
            .When(x => x.ImpactScore.HasValue);

        RuleFor(x => x.ConfidenceScore)
            .InclusiveBetween(1, 10).WithMessage("Confidence score must be between 1 and 10")
            .When(x => x.ConfidenceScore.HasValue);

        RuleFor(x => x.ActionabilityScore)
            .InclusiveBetween(1, 10).WithMessage("Actionability score must be between 1 and 10")
            .When(x => x.ActionabilityScore.HasValue);

        RuleFor(x => x.ReviewNotes)
            .MaximumLength(1000).WithMessage("Review notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.ReviewNotes));

        RuleFor(x => x.Tags)
            .Must(tags => tags == null || tags.Count <= 10)
            .WithMessage("Cannot have more than 10 tags");

        RuleFor(x => x.Quotes)
            .Must(quotes => quotes == null || quotes.Count <= 5)
            .WithMessage("Cannot have more than 5 quotes");

        RuleFor(x => x.TalkingPoints)
            .Must(points => points == null || points.Count <= 10)
            .WithMessage("Cannot have more than 10 talking points");
    }

    private bool BeValidCategory(string? category)
    {
        if (string.IsNullOrEmpty(category)) return true;
        
        var validCategories = new[] 
        { 
            "insight", "tip", "trend", "opinion", "news", 
            "case_study", "best_practice", "lesson_learned", "other" 
        };
        return validCategories.Contains(category.ToLower());
    }

    private bool BeValidPostType(string? postType)
    {
        if (string.IsNullOrEmpty(postType)) return true;
        
        var validTypes = new[] 
        { 
            "educational", "inspirational", "promotional", 
            "conversational", "news", "opinion", "how_to" 
        };
        return validTypes.Contains(postType.ToLower());
    }

    private bool BeValidStatus(string? status)
    {
        if (string.IsNullOrEmpty(status)) return true;
        
        var validStatuses = new[] 
        { 
            "draft", "pending_review", "approved", "rejected", "archived" 
        };
        return validStatuses.Contains(status.ToLower());
    }
}

public class BulkUpdateInsightsDtoValidator : AbstractValidator<BulkUpdateInsightsDto>
{
    public BulkUpdateInsightsDtoValidator()
    {
        RuleFor(x => x.InsightIds)
            .NotEmpty().WithMessage("At least one insight ID is required")
            .Must(ids => ids.Count <= 100).WithMessage("Cannot update more than 100 insights at once");

        RuleFor(x => x.Status)
            .Must(BeValidStatus).WithMessage("Invalid status")
            .When(x => !string.IsNullOrEmpty(x.Status));

        RuleFor(x => x.ReviewNotes)
            .MaximumLength(1000).WithMessage("Review notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.ReviewNotes));
    }

    private bool BeValidStatus(string? status)
    {
        if (string.IsNullOrEmpty(status)) return true;
        
        var validStatuses = new[] 
        { 
            "draft", "pending_review", "approved", "rejected", "archived" 
        };
        return validStatuses.Contains(status.ToLower());
    }
}