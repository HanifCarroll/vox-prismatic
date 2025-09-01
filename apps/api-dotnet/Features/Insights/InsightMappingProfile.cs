using AutoMapper;
using ContentCreation.Api.Features.Insights.DTOs;

namespace ContentCreation.Api.Features.Insights;

public class InsightMappingProfile : Profile
{
    public InsightMappingProfile()
    {
        CreateMap<Insight, InsightDto>();
        CreateMap<CreateInsightDto, Insight>();
    }
}