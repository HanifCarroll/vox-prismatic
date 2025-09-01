using AutoMapper;
using ContentCreation.Api.Features.Transcripts.DTOs;
using ContentCreation.Api.Features.Transcripts.Interfaces;
using ContentCreation.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Transcripts;

public class TranscriptService : ITranscriptService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<TranscriptService> _logger;

    public TranscriptService(
        ApplicationDbContext context,
        IMapper mapper,
        ILogger<TranscriptService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<IEnumerable<TranscriptDto>> GetAllAsync()
    {
        var transcripts = await _context.Transcripts
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
        
        return _mapper.Map<IEnumerable<TranscriptDto>>(transcripts);
    }

    public async Task<TranscriptDto?> GetByIdAsync(Guid id)
    {
        var transcript = await _context.Transcripts
            .FirstOrDefaultAsync(t => t.Id == id);
        
        return transcript != null ? _mapper.Map<TranscriptDto>(transcript) : null;
    }

    public async Task<TranscriptDto> CreateAsync(CreateTranscriptDto dto)
    {
        var transcript = _mapper.Map<Transcript>(dto);
        transcript.Id = Guid.NewGuid();
        transcript.CreatedAt = DateTime.UtcNow;
        transcript.UpdatedAt = DateTime.UtcNow;
        
        _context.Transcripts.Add(transcript);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created transcript with ID {TranscriptId}", transcript.Id);
        
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<TranscriptDto?> UpdateAsync(Guid id, UpdateTranscriptDto dto)
    {
        var transcript = await _context.Transcripts.FindAsync(id);
        if (transcript == null)
        {
            return null;
        }
        
        if (dto.Title != null) transcript.Title = dto.Title;
        if (dto.Content != null) transcript.Content = dto.Content;
        if (dto.Source != null) transcript.Source = dto.Source;
        if (dto.Duration.HasValue) transcript.Duration = dto.Duration;
        if (dto.AudioFileUrl != null) transcript.AudioFileUrl = dto.AudioFileUrl;
        
        transcript.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Updated transcript with ID {TranscriptId}", id);
        
        return _mapper.Map<TranscriptDto>(transcript);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var transcript = await _context.Transcripts.FindAsync(id);
        if (transcript == null)
        {
            return false;
        }
        
        _context.Transcripts.Remove(transcript);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted transcript with ID {TranscriptId}", id);
        
        return true;
    }

    public async Task<IEnumerable<Insights.DTOs.InsightDto>> GetInsightsAsync(Guid transcriptId)
    {
        var insights = await _context.Insights
            .Where(i => i.TranscriptId == transcriptId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
        
        return _mapper.Map<IEnumerable<Insights.DTOs.InsightDto>>(insights);
    }
}