using AutoMapper;
using ContentCreation.Api.Features.Insights.DTOs;
using ContentCreation.Api.Features.Insights.Interfaces;
using ContentCreation.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Features.Insights;

public class InsightService : IInsightService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<InsightService> _logger;

    public InsightService(
        ApplicationDbContext context,
        IMapper mapper,
        ILogger<InsightService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<IEnumerable<InsightDto>> GetAllAsync()
    {
        var insights = await _context.Insights
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
        
        return _mapper.Map<IEnumerable<InsightDto>>(insights);
    }

    public async Task<InsightDto?> GetByIdAsync(Guid id)
    {
        var insight = await _context.Insights
            .FirstOrDefaultAsync(i => i.Id == id);
        
        return insight != null ? _mapper.Map<InsightDto>(insight) : null;
    }

    public async Task<IEnumerable<InsightDto>> GetByTranscriptIdAsync(Guid transcriptId)
    {
        var insights = await _context.Insights
            .Where(i => i.TranscriptId == transcriptId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
        
        return _mapper.Map<IEnumerable<InsightDto>>(insights);
    }

    public async Task<InsightDto> CreateAsync(CreateInsightDto dto)
    {
        var insight = _mapper.Map<Insight>(dto);
        insight.Id = Guid.NewGuid();
        insight.CreatedAt = DateTime.UtcNow;
        insight.UpdatedAt = DateTime.UtcNow;
        
        _context.Insights.Add(insight);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created insight with ID {InsightId} for transcript {TranscriptId}", 
            insight.Id, insight.TranscriptId);
        
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<InsightDto?> UpdateAsync(Guid id, UpdateInsightDto dto)
    {
        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            return null;
        }
        
        if (dto.Content != null) insight.Content = dto.Content;
        if (dto.Category != null) insight.Category = dto.Category;
        if (dto.IsReviewed.HasValue) insight.IsReviewed = dto.IsReviewed.Value;
        
        insight.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Updated insight with ID {InsightId}", id);
        
        return _mapper.Map<InsightDto>(insight);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            return false;
        }
        
        _context.Insights.Remove(insight);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted insight with ID {InsightId}", id);
        
        return true;
    }

    public async Task<InsightDto?> MarkAsReviewedAsync(Guid id)
    {
        var insight = await _context.Insights.FindAsync(id);
        if (insight == null)
        {
            return null;
        }
        
        insight.IsReviewed = true;
        insight.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Marked insight {InsightId} as reviewed", id);
        
        return _mapper.Map<InsightDto>(insight);
    }
}