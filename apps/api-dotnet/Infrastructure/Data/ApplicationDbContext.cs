using ContentCreation.Api.Features.Transcripts;
using ContentCreation.Api.Features.Insights;
using ContentCreation.Api.Features.Posts;
using ContentCreation.Api.Features.Pipeline;
using ContentCreation.Api.Features.Analytics;
using ContentCreation.Api.Features.Settings;
using ContentCreation.Api.Features.Jobs;
using Microsoft.EntityFrameworkCore;

namespace ContentCreation.Api.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Transcript> Transcripts { get; set; }
    public DbSet<Insight> Insights { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<ScheduledPost> ScheduledPosts { get; set; }
    public DbSet<ProcessingJob> ProcessingJobs { get; set; }
    public DbSet<Setting> Settings { get; set; }
    public DbSet<AnalyticsEvent> AnalyticsEvents { get; set; }
    public DbSet<Features.Pipeline.Pipeline> Pipelines { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Transcript entity
        modelBuilder.Entity<Transcript>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Source).HasMaxLength(100);
            entity.Property(e => e.Duration);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure Insight entity
        modelBuilder.Entity<Insight>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.IsReviewed).HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasOne(e => e.Transcript)
                  .WithMany(t => t.Insights)
                  .HasForeignKey(e => e.TranscriptId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.TranscriptId);
            entity.HasIndex(e => e.IsReviewed);
        });

        // Configure Post entity
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.IsReviewed).HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasOne(e => e.Insight)
                  .WithMany(i => i.Posts)
                  .HasForeignKey(e => e.InsightId)
                  .OnDelete(DeleteBehavior.SetNull);
            
            entity.HasIndex(e => e.InsightId);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Status);
        });

        // Configure ScheduledPost entity
        modelBuilder.Entity<ScheduledPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ScheduledFor).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasOne(e => e.Post)
                  .WithMany(p => p.ScheduledPosts)
                  .HasForeignKey(e => e.PostId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.ScheduledFor);
            entity.HasIndex(e => e.Status);
        });

        // Configure ProcessingJob entity
        modelBuilder.Entity<ProcessingJob>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Progress).HasDefaultValue(0);
            entity.Property(e => e.Data).HasColumnType("jsonb");
            entity.Property(e => e.Result).HasColumnType("jsonb");
            entity.Property(e => e.Error).HasColumnType("text");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => new { e.Type, e.Status });
        });

        // Configure Setting entity
        modelBuilder.Entity<Setting>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Value).HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasIndex(e => e.Key).IsUnique();
        });

        // Configure AnalyticsEvent entity
        modelBuilder.Entity<AnalyticsEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EventData).HasColumnType("jsonb");
            entity.Property(e => e.UserId).HasMaxLength(100);
            entity.Property(e => e.SessionId).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.UserId);
        });

        // Configure Pipeline entity
        modelBuilder.Entity<Features.Pipeline.Pipeline>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.CurrentStage).HasMaxLength(100);
            entity.Property(e => e.StateData).HasColumnType("jsonb");
            entity.Property(e => e.Config).HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.HasOne(e => e.Transcript)
                  .WithMany(t => t.Pipelines)
                  .HasForeignKey(e => e.TranscriptId)
                  .OnDelete(DeleteBehavior.SetNull);
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TranscriptId);
        });
    }
}