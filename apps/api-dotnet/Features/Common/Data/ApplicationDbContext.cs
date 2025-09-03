using ContentCreation.Api.Features.Common.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Text.Json;

namespace ContentCreation.Api.Features.Common.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<ContentProject> ContentProjects { get; set; }
    public DbSet<ProjectActivity> ProjectActivities { get; set; }
    public DbSet<Transcript> Transcripts { get; set; }
    public DbSet<Insight> Insights { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<OAuthToken> OAuthTokens { get; set; }
    public DbSet<ScheduledPost> ScheduledPosts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // Configure ContentProject entity
        modelBuilder.Entity<ContentProject>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.SourceType).HasMaxLength(50);
            entity.Property(e => e.SourceUrl).HasMaxLength(500);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.FilePath).HasMaxLength(500);
            
            // Configure value objects
            entity.OwnsOne(e => e.AutoApprovalSettings, workflow =>
            {
                workflow.Property(w => w.AutoApproveInsights);
                workflow.Property(w => w.MinInsightScore);
                workflow.Property(w => w.AutoGeneratePosts);
                workflow.Property(w => w.AutoSchedulePosts);
            });
            
            entity.OwnsOne(e => e.PublishingSchedule, schedule =>
            {
                schedule.Property(s => s.PreferredDays)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<List<DayOfWeek>>(v, (JsonSerializerOptions?)null) ?? new List<DayOfWeek>());
                schedule.Property(s => s.PreferredTime);
                schedule.Property(s => s.TimeZone).HasMaxLength(50);
                schedule.Property(s => s.MinimumInterval);
            });
            
            entity.HasOne(e => e.Transcript)
                  .WithOne(t => t.Project)
                  .HasForeignKey<Transcript>(t => t.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.CurrentStage);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.CreatedBy);
        });

        // Configure ProjectActivity entity
        modelBuilder.Entity<ProjectActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActivityType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ActivityName).HasMaxLength(100);
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Activities)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.OccurredAt);
        });

        // Configure Transcript entity
        modelBuilder.Entity<Transcript>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.RawContent).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50);
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure Insight entity
        modelBuilder.Entity<Insight>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Summary).IsRequired();
            entity.Property(e => e.VerbatimQuote).IsRequired();
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PostType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Insights)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TotalScore);
        });

        // Configure Post entity
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Platform).IsRequired().HasConversion<string>();
            entity.Property(e => e.Status).HasMaxLength(50);
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Posts)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Insight)
                  .WithMany(i => i.Posts)
                  .HasForeignKey(e => e.InsightId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Platform);
        });

        // Configure ScheduledPost entity
        modelBuilder.Entity<ScheduledPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasConversion<string>();
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.ScheduledTime);
            entity.Property(e => e.Status);
            entity.Property(e => e.ErrorMessage);
            entity.Property(e => e.FailureReason);
            
            entity.HasOne(e => e.Post)
                  .WithMany()
                  .HasForeignKey(e => e.PostId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.ScheduledPosts)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ScheduledTime);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.Status, e.ScheduledTime });
        });

        // Configure OAuthToken entity
        modelBuilder.Entity<OAuthToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasConversion<string>();
            entity.Property(e => e.AccessTokenEncrypted).IsRequired();
            entity.Property(e => e.RefreshTokenEncrypted);
            entity.Property(e => e.Scope).HasMaxLength(500);
            
            entity.HasIndex(e => new { e.UserId, e.Platform });
            entity.HasIndex(e => e.ExpiresAt);
        });

        // Apply any seed data if needed
        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Add any seed data here if needed
    }
}