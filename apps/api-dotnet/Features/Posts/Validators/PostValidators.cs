using FluentValidation;
using ContentCreation.Api.Features.Posts.DTOs;

namespace ContentCreation.Api.Features.Posts.Validators;

public class CreatePostDtoValidator : AbstractValidator<CreatePostDto>
{
    public CreatePostDtoValidator()
    {
        RuleFor(x => x.InsightId)
            .NotEmpty().WithMessage("Insight ID is required");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MinimumLength(3).WithMessage("Title must be at least 3 characters")
            .MaximumLength(200).WithMessage("Title cannot exceed 200 characters");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Content is required")
            .MinimumLength(10).WithMessage("Content must be at least 10 characters")
            .MaximumLength(GetMaxLengthForPlatform).WithMessage("Content exceeds platform limit");

        RuleFor(x => x.Platform)
            .NotEmpty().WithMessage("Platform is required")
            .Must(BeValidPlatform).WithMessage("Invalid platform");

        RuleFor(x => x.Hashtags)
            .Must(hashtags => hashtags == null || hashtags.Count <= 30)
            .WithMessage("Cannot have more than 30 hashtags")
            .Must(hashtags => hashtags == null || hashtags.All(h => h.StartsWith("#")))
            .WithMessage("All hashtags must start with #");

        RuleFor(x => x.Mentions)
            .Must(mentions => mentions == null || mentions.Count <= 10)
            .WithMessage("Cannot have more than 10 mentions")
            .Must(mentions => mentions == null || mentions.All(m => m.StartsWith("@")))
            .WithMessage("All mentions must start with @");
    }

    private int GetMaxLengthForPlatform(CreatePostDto dto)
    {
        return dto.Platform?.ToLower() switch
        {
            "twitter" or "x" => 280,
            "linkedin" => 3000,
            "facebook" => 63206,
            "instagram" => 2200,
            _ => 5000
        };
    }

    private bool BeValidPlatform(string platform)
    {
        var validPlatforms = new[] 
        { 
            "twitter", "x", "linkedin", "facebook", "instagram", "threads" 
        };
        return validPlatforms.Contains(platform.ToLower());
    }
}

public class UpdatePostDtoValidator : AbstractValidator<UpdatePostDto>
{
    public UpdatePostDtoValidator()
    {
        RuleFor(x => x.Title)
            .MinimumLength(3).WithMessage("Title must be at least 3 characters")
            .MaximumLength(200).WithMessage("Title cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Title));

        RuleFor(x => x.Content)
            .MinimumLength(10).WithMessage("Content must be at least 10 characters")
            .When(x => !string.IsNullOrEmpty(x.Content));

        RuleFor(x => x.Status)
            .Must(BeValidStatus).WithMessage("Invalid status")
            .When(x => !string.IsNullOrEmpty(x.Status));

        RuleFor(x => x.ReviewNotes)
            .MaximumLength(1000).WithMessage("Review notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.ReviewNotes));

        RuleFor(x => x.Hashtags)
            .Must(hashtags => hashtags == null || hashtags.Count <= 30)
            .WithMessage("Cannot have more than 30 hashtags")
            .Must(hashtags => hashtags == null || hashtags.All(h => h.StartsWith("#")))
            .WithMessage("All hashtags must start with #");

        RuleFor(x => x.Mentions)
            .Must(mentions => mentions == null || mentions.Count <= 10)
            .WithMessage("Cannot have more than 10 mentions")
            .Must(mentions => mentions == null || mentions.All(m => m.StartsWith("@")))
            .WithMessage("All mentions must start with @");
    }

    private bool BeValidStatus(string? status)
    {
        if (string.IsNullOrEmpty(status)) return true;
        
        var validStatuses = new[] 
        { 
            "draft", "pending_review", "approved", "rejected", 
            "scheduled", "published", "failed", "archived" 
        };
        return validStatuses.Contains(status.ToLower());
    }
}

public class SchedulePostDtoValidator : AbstractValidator<SchedulePostDto>
{
    public SchedulePostDtoValidator()
    {
        RuleFor(x => x.PostId)
            .NotEmpty().WithMessage("Post ID is required");

        RuleFor(x => x.ScheduledTime)
            .NotEmpty().WithMessage("Scheduled time is required")
            .GreaterThan(DateTime.UtcNow.AddMinutes(5))
            .WithMessage("Scheduled time must be at least 5 minutes in the future")
            .LessThan(DateTime.UtcNow.AddYears(1))
            .WithMessage("Scheduled time cannot be more than 1 year in the future");

        RuleFor(x => x.TimeZone)
            .Must(BeValidTimeZone).WithMessage("Invalid timezone")
            .When(x => !string.IsNullOrEmpty(x.TimeZone));
    }

    private bool BeValidTimeZone(string? timeZone)
    {
        if (string.IsNullOrEmpty(timeZone)) return true;
        
        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(timeZone);
            return true;
        }
        catch
        {
            return false;
        }
    }
}

public class BulkUpdatePostsDtoValidator : AbstractValidator<BulkUpdatePostsDto>
{
    public BulkUpdatePostsDtoValidator()
    {
        RuleFor(x => x.PostIds)
            .NotEmpty().WithMessage("At least one post ID is required")
            .Must(ids => ids.Count <= 100).WithMessage("Cannot update more than 100 posts at once");

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
            "draft", "pending_review", "approved", "rejected", 
            "scheduled", "published", "failed", "archived" 
        };
        return validStatuses.Contains(status.ToLower());
    }
}

public class PostFilterDtoValidator : AbstractValidator<PostFilterDto>
{
    public PostFilterDtoValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1).WithMessage("Page must be at least 1");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100).WithMessage("Page size must be between 1 and 100");

        RuleFor(x => x.Platform)
            .Must(BeValidPlatform).WithMessage("Invalid platform")
            .When(x => !string.IsNullOrEmpty(x.Platform));

        RuleFor(x => x.Status)
            .Must(BeValidStatus).WithMessage("Invalid status")
            .When(x => !string.IsNullOrEmpty(x.Status));

        RuleFor(x => x.PublishedAfter)
            .LessThan(x => x.PublishedBefore)
            .WithMessage("PublishedAfter must be before PublishedBefore")
            .When(x => x.PublishedAfter.HasValue && x.PublishedBefore.HasValue);

        RuleFor(x => x.SortBy)
            .Must(BeValidSortField).WithMessage("Invalid sort field")
            .When(x => !string.IsNullOrEmpty(x.SortBy));
    }

    private bool BeValidPlatform(string? platform)
    {
        if (string.IsNullOrEmpty(platform)) return true;
        
        var validPlatforms = new[] 
        { 
            "twitter", "x", "linkedin", "facebook", "instagram", "threads" 
        };
        return validPlatforms.Contains(platform.ToLower());
    }

    private bool BeValidStatus(string? status)
    {
        if (string.IsNullOrEmpty(status)) return true;
        
        var validStatuses = new[] 
        { 
            "draft", "pending_review", "approved", "rejected", 
            "scheduled", "published", "failed", "archived" 
        };
        return validStatuses.Contains(status.ToLower());
    }

    private bool BeValidSortField(string? sortBy)
    {
        if (string.IsNullOrEmpty(sortBy)) return true;
        
        var validFields = new[] 
        { 
            "createdAt", "updatedAt", "publishedAt", "title", 
            "platform", "status", "characterCount" 
        };
        return validFields.Contains(sortBy);
    }
}