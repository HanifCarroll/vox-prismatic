using AutoMapper;
using ContentCreation.Api.Features.Transcripts.DTOs;

namespace ContentCreation.Api.Features.Transcripts;

public class TranscriptMappingProfile : Profile
{
    public TranscriptMappingProfile()
    {
        CreateMap<Transcript, TranscriptDto>();
        CreateMap<CreateTranscriptDto, Transcript>();
    }
}