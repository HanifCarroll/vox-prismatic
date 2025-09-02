using AutoMapper;
using ContentCreation.Core.DTOs;
using ContentCreation.Core.DTOs.Insights;
using ContentCreation.Core.DTOs.Posts;
using ContentCreation.Core.DTOs.Transcripts;
using ContentCreation.Core.Entities;

namespace ContentCreation.Infrastructure.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ContentProject, ContentProjectDto>()
            .ForMember(dest => dest.InsightIds, 
                opt => opt.MapFrom(src => src.Insights.Select(i => i.Id).ToList()))
            .ForMember(dest => dest.PostIds, 
                opt => opt.MapFrom(src => src.Posts.Select(p => p.Id).ToList()))
            .ForMember(dest => dest.ScheduledPostIds, 
                opt => opt.MapFrom(src => src.ScheduledPosts.Select(sp => sp.Id).ToList()));

        CreateMap<ContentProject, ContentProjectDetailDto>()
            .IncludeBase<ContentProject, ContentProjectDto>()
            .ForMember(dest => dest.Transcript, 
                opt => opt.MapFrom(src => src.Transcript))
            .ForMember(dest => dest.Insights, 
                opt => opt.MapFrom(src => src.Insights))
            .ForMember(dest => dest.Posts, 
                opt => opt.MapFrom(src => src.Posts))
            .ForMember(dest => dest.ScheduledPosts, 
                opt => opt.MapFrom(src => src.ScheduledPosts))
            .ForMember(dest => dest.RecentEvents, 
                opt => opt.MapFrom(src => src.Events.OrderByDescending(e => e.OccurredAt).Take(10)));

        CreateMap<WorkflowConfiguration, WorkflowConfigurationDto>().ReverseMap();
        CreateMap<PublishingSchedule, PublishingScheduleDto>()
            .ForMember(dest => dest.PreferredTime, 
                opt => opt.MapFrom(src => src.PreferredTime.ToString("HH:mm")))
            .ReverseMap()
            .ForMember(dest => dest.PreferredTime, 
                opt => opt.MapFrom(src => TimeOnly.Parse(src.PreferredTime)));

        CreateMap<ProjectMetrics, ProjectMetricsDto>().ReverseMap();

        CreateMap<Transcript, TranscriptSummaryDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "raw"));

        CreateMap<Insight, InsightSummaryDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "draft"));

        CreateMap<Post, PostSummaryDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "draft"));

        CreateMap<ProjectScheduledPost, ScheduledPostSummaryDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "pending"));

        CreateMap<ProjectEvent, ProjectEventDto>();

        // Insight mappings
        CreateMap<Insight, InsightDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "draft"));
        
        CreateMap<CreateInsightDto, Insight>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.ProjectId, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "draft"))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));
        
        CreateMap<UpdateInsightDto, Insight>()
            .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

        // Post mappings
        CreateMap<Post, PostDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "draft"))
            .ForMember(dest => dest.Platform, 
                opt => opt.MapFrom(src => src.Platform ?? "linkedin"));
        
        CreateMap<CreatePostDto, Post>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.ProjectId, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "draft"))
            .ForMember(dest => dest.Platform, opt => opt.MapFrom(src => src.Platform.ToString()))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));
        
        CreateMap<UpdatePostDto, Post>()
            .ForMember(dest => dest.Platform, opt => opt.MapFrom(src => src.Platform.HasValue ? src.Platform.Value.ToString() : null))
            .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
        
        CreateMap<ProjectScheduledPost, ScheduledPostDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "pending"));

        // Transcript mappings
        CreateMap<Transcript, TranscriptDto>()
            .ForMember(dest => dest.Status, 
                opt => opt.MapFrom(src => src.Status ?? "raw"))
            .ForMember(dest => dest.SourceType, 
                opt => opt.MapFrom(src => src.SourceType ?? "manual"));
        
        CreateMap<CreateTranscriptDto, Transcript>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.ProjectId, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => "raw"))
            .ForMember(dest => dest.SourceType, opt => opt.MapFrom(src => src.SourceType.ToString()))
            .ForMember(dest => dest.WordCount, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));
        
        CreateMap<UpdateTranscriptDto, Transcript>()
            .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
    }
}