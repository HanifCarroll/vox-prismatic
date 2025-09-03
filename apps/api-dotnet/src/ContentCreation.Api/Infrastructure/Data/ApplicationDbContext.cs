using ContentCreation.Api.Features.Common.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Text.Json;

namespace ContentCreation.Api.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<ContentProject> ContentProjects { get; set; }
    public DbSet<ProjectActivity> ProjectActivities { get; set; }
    public DbSet<ProjectProcessingJob> ProjectProcessingJobs { get; set; }
    public DbSet<ProjectScheduledPost> ProjectScheduledPosts { get; set; }
    public DbSet<Transcript> Transcripts { get; set; }
    public DbSet<Insight> Insights { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<Setting> Settings { get; set; }
    public DbSet<AnalyticsEvent> AnalyticsEvents { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<PromptTemplate> PromptTemplates { get; set; }
    public DbSet<PromptHistory> PromptHistory { get; set; }
    public DbSet<OAuthToken> OAuthTokens { get; set; }
    public DbSet<ScheduledPost> ScheduledPosts { get; set; }
    public DbSet<PlatformAuth> PlatformAuths { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.EmailVerificationToken).HasMaxLength(100);
            entity.Property(e => e.PasswordResetToken).HasMaxLength(100);
            entity.Property(e => e.RefreshToken).HasMaxLength(500);
            
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.RefreshToken);
            entity.HasIndex(e => e.EmailVerificationToken);
            entity.HasIndex(e => e.PasswordResetToken);
        });

        // Configure ContentProject entity
        modelBuilder.Entity<ContentProject>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Tags)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());
            entity.Property(e => e.SourceType).HasMaxLength(50);
            entity.Property(e => e.SourceUrl).HasMaxLength(500);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.FilePath).HasMaxLength(500);
            entity.Property(e => e.CurrentStage).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CreatedBy).IsRequired();
            
            entity.HasOne<User>()
                  .WithMany(u => u.Projects)
                  .HasForeignKey(e => e.CreatedBy)
                  .OnDelete(DeleteBehavior.Restrict);
            
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
            
            entity.OwnsOne(e => e.Metrics, metrics =>
            {
                metrics.Property(m => m.TranscriptWordCount);
                metrics.Property(m => m.InsightsTotal);
                metrics.Property(m => m.InsightsApproved);
                metrics.Property(m => m.InsightsRejected);
                metrics.Property(m => m.PostsTotal);
                metrics.Property(m => m.PostsApproved);
                metrics.Property(m => m.PostsScheduled);
                metrics.Property(m => m.PostsPublished);
                metrics.Property(m => m.PostsFailed);
                metrics.Property(m => m.TotalProcessingTimeMs);
                metrics.Property(m => m.EstimatedCost);
            });
            
            entity.HasOne(e => e.Transcript)
                  .WithOne(t => t.Project)
                  .HasForeignKey<Transcript>(t => t.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.CurrentStage);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.CreatedBy);
            entity.HasIndex(e => new { e.CurrentStage, e.CreatedAt });
        });

        // Configure ProjectActivity entity
        modelBuilder.Entity<ProjectActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActivityType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ActivityName).HasMaxLength(100);
            entity.Property(e => e.Description);
            entity.Property(e => e.Metadata);
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Activities)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.ActivityType);
            entity.HasIndex(e => e.OccurredAt);
        });

        // Configure ProjectProcessingJob entity
        modelBuilder.Entity<ProjectProcessingJob>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.JobType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.LastError)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<object>(v ?? "{}", (JsonSerializerOptions?)null));
            entity.Property(e => e.Metadata)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<object>(v ?? "{}", (JsonSerializerOptions?)null));
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.ProcessingJobs)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => new { e.JobType, e.Status });
            entity.HasIndex(e => e.Status);
        });

        // Configure ProjectScheduledPost entity
        modelBuilder.Entity<ProjectScheduledPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50);
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.ScheduledPosts)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Post)
                  .WithMany(p => p.ScheduledPosts)
                  .HasForeignKey(e => e.PostId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ScheduledTime);
            entity.HasIndex(e => new { e.Status, e.ScheduledTime });
        });

        // Configure Transcript entity
        modelBuilder.Entity<Transcript>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.RawContent).IsRequired();
            entity.Property(e => e.CleanedContent);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.SourceType).HasMaxLength(50);
            entity.Property(e => e.SourceUrl).HasMaxLength(500);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.FilePath).HasMaxLength(500);
            entity.Property(e => e.QueueJobId);
            entity.Property(e => e.EstimatedTokens);
            entity.Property(e => e.EstimatedCost);
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.Status, e.CreatedAt });
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
            entity.HasIndex(e => e.TranscriptId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TotalScore);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.Status, e.TotalScore });
            entity.HasIndex(e => new { e.ProjectId, e.Status });
        });

        // Configure Post entity
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.Metadata)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, object>>(v ?? "{}", (JsonSerializerOptions?)null));
            
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Posts)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Insight)
                  .WithMany(i => i.Posts)
                  .HasForeignKey(e => e.InsightId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.InsightId);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.Platform, e.Status });
            entity.HasIndex(e => new { e.ProjectId, e.Status });
        });

        // Configure Setting entity
        modelBuilder.Entity<Setting>(entity =>
        {
            entity.HasKey(e => e.Key);
            entity.Property(e => e.Value).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.Description);
            
            entity.HasIndex(e => e.Category);
        });

        // Configure AnalyticsEvent entity
        modelBuilder.Entity<AnalyticsEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityId).IsRequired();
            entity.Property(e => e.EventData);
            entity.Property(e => e.Value);
            
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.OccurredAt);
        });

        // Configure Notification entity
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Priority).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Message).IsRequired();
            entity.Property(e => e.ActionUrl).HasMaxLength(500);
            entity.Property(e => e.MetadataJson);
            
            entity.HasOne<User>()
                  .WithMany(u => u.Notifications)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.SetNull);
            
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Priority);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.UserId, e.Status });
        });

        // Configure PromptTemplate entity
        modelBuilder.Entity<PromptTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Category).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Model).IsRequired();
            entity.Property(e => e.Template).IsRequired();
            entity.Property(e => e.VariablesJson);
            entity.Property(e => e.ModelParametersJson);
            entity.Property(e => e.Version).IsRequired();
            entity.Property(e => e.IsDefault).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsDefault);
            entity.HasIndex(e => new { e.Category, e.IsDefault });
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure PromptHistory entity
        modelBuilder.Entity<PromptHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TemplateVersion).IsRequired();
            entity.Property(e => e.RenderedPrompt).IsRequired();
            entity.Property(e => e.VariablesJson);
            entity.Property(e => e.Response);
            entity.Property(e => e.Success).IsRequired();
            entity.Property(e => e.ExecutionTimeMs).IsRequired();
            entity.Property(e => e.UserId).HasMaxLength(100);
            entity.Property(e => e.Error).HasMaxLength(1000);
            
            entity.HasOne(e => e.Template)
                  .WithMany(t => t.History)
                  .HasForeignKey(e => e.TemplateId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.SetNull);
            
            entity.HasIndex(e => e.TemplateId);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.ExecutedAt);
            entity.HasIndex(e => new { e.TemplateId, e.Success });
        });

        // Configure OAuthToken entity
        modelBuilder.Entity<OAuthToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.AccessTokenEncrypted).IsRequired();
            entity.Property(e => e.RefreshTokenEncrypted);
            entity.Property(e => e.ExpiresAt);
            
            entity.HasOne<User>()
                  .WithMany(u => u.OAuthTokens)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => new { e.UserId, e.Platform }).IsUnique();
            entity.HasIndex(e => e.ExpiresAt);
        });

        // Configure ScheduledPost entity
        modelBuilder.Entity<ScheduledPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.ErrorMessage);
            entity.Property(e => e.PublishUrl);
            entity.Property(e => e.HangfireJobId);
            entity.Property(e => e.ExternalPostId).HasMaxLength(100);
            entity.Property(e => e.JobId);
            entity.Property(e => e.Platforms)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());
            
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.Post)
                  .WithMany()
                  .HasForeignKey(e => e.PostId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ScheduledTime);
            entity.HasIndex(e => new { e.Status, e.ScheduledTime });
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Property("UpdatedAt") != null)
            {
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
            }

            if (entry.State == EntityState.Added && entry.Property("CreatedAt") != null)
            {
                entry.Property("CreatedAt").CurrentValue = DateTime.UtcNow;
            }
        }
    }
}