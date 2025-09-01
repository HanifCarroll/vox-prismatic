using AutoMapper;
using ContentCreation.Api.Features.Projects.DTOs;
using ContentCreation.Api.Features.Transcripts;
using ContentCreation.Api.Features.Insights;
using ContentCreation.Api.Features.Posts;

namespace ContentCreation.Api.Features.Projects;

public class ProjectMappingProfile : Profile
{
    public ProjectMappingProfile()
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
    }
}