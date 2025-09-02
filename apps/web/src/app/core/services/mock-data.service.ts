import { Injectable } from '@angular/core';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  ContentProject, 
  ProjectStage, 
  SourceType, 
  Platform,
  Insight,
  Post,
  ScheduledPost,
  Transcript,
  ProcessingJob
} from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private projectIdCounter = 1;
  private insightIdCounter = 1;
  private postIdCounter = 1;
  
  private projectsSubject = new BehaviorSubject<ContentProject[]>(this.generateMockProjects());
  
  constructor() {}
  
  private generateMockProjects(): ContentProject[] {
    return [
      this.createMockProject(
        'AI Revolution Podcast Episode',
        'Discussion about the latest developments in artificial intelligence and its impact on society',
        ProjectStage.INSIGHTS_READY,
        60
      ),
      this.createMockProject(
        'Product Launch Announcement',
        'Announcing our new SaaS platform for content creators',
        ProjectStage.POSTS_GENERATED,
        75
      ),
      this.createMockProject(
        'Weekly Team Meeting Notes',
        'Q4 planning session with key stakeholders',
        ProjectStage.SCHEDULED,
        90
      ),
      this.createMockProject(
        'Customer Success Story',
        'How XYZ Corp increased productivity by 40% using our solution',
        ProjectStage.PUBLISHED,
        100
      ),
      this.createMockProject(
        'Industry Trends Report',
        'Analysis of emerging trends in content marketing for 2024',
        ProjectStage.PROCESSING_CONTENT,
        25
      ),
      this.createMockProject(
        'Webinar Recording',
        'Best practices for social media content creation',
        ProjectStage.RAW_CONTENT,
        0
      )
    ];
  }
  
  private createMockProject(
    title: string,
    description: string,
    stage: ProjectStage,
    progress: number
  ): ContentProject {
    const id = `project-${this.projectIdCounter++}`;
    const now = new Date();
    const createdDaysAgo = Math.floor(Math.random() * 30);
    const created = new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000);
    
    const project: ContentProject = {
      id,
      title,
      description,
      tags: this.generateRandomTags(),
      sourceType: SourceType.AUDIO,
      currentStage: stage,
      overallProgress: progress,
      createdBy: 'user@example.com',
      createdAt: created,
      updatedAt: new Date(created.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(),
      targetPlatforms: this.generateRandomPlatforms(),
      summary: {
        insightsTotal: Math.floor(Math.random() * 10) + 5,
        insightsApproved: Math.floor(Math.random() * 8),
        postsTotal: Math.floor(Math.random() * 15) + 8,
        postsScheduled: Math.floor(Math.random() * 10),
        postsPublished: stage === ProjectStage.PUBLISHED ? Math.floor(Math.random() * 8) + 2 : 0
      }
    };
    
    // Add transcript if past RAW_CONTENT stage
    if (progress > 0) {
      project.transcript = this.generateMockTranscript(id);
    }
    
    // Add insights if past PROCESSING_CONTENT stage
    if (progress >= 50) {
      project.insights = this.generateMockInsights(id, project.summary?.insightsTotal || 5);
    }
    
    // Add posts if past INSIGHTS_APPROVED stage
    if (progress >= 75) {
      project.posts = this.generateMockPosts(id, project.insights?.length || 5);
    }
    
    return project;
  }
  
  private generateMockTranscript(projectId: string): Transcript {
    return {
      id: `transcript-${projectId}`,
      projectId,
      content: `This is a sample transcript content for the project. It contains various insights about the topic being discussed...`,
      cleanedContent: `This is the cleaned version of the transcript with better formatting and removed filler words...`,
      duration: Math.floor(Math.random() * 3600) + 600,
      wordCount: Math.floor(Math.random() * 5000) + 1000,
      speakerLabels: ['Speaker 1', 'Speaker 2'],
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  private generateMockInsights(projectId: string, count: number): Insight[] {
    const insights: Insight[] = [];
    const categories = ['Key Point', 'Quote', 'Statistic', 'Recommendation', 'Observation'];
    const postTypes = ['Educational', 'Inspirational', 'News', 'Opinion', 'How-to'];
    
    for (let i = 0; i < count; i++) {
      insights.push({
        id: `insight-${this.insightIdCounter++}`,
        projectId,
        transcriptId: `transcript-${projectId}`,
        content: `This is insight #${i + 1}: A valuable observation about the topic that could be turned into engaging social media content.`,
        quote: `"This is a powerful quote from the transcript that captures the essence of the insight."`,
        score: Math.random() * 100,
        category: categories[Math.floor(Math.random() * categories.length)],
        postType: postTypes[Math.floor(Math.random() * postTypes.length)],
        isApproved: Math.random() > 0.3,
        reviewedBy: Math.random() > 0.3 ? 'reviewer@example.com' : undefined,
        reviewedAt: Math.random() > 0.3 ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return insights;
  }
  
  private generateMockPosts(projectId: string, insightCount: number): Post[] {
    const posts: Post[] = [];
    
    for (let i = 0; i < insightCount * 2; i++) {
      const platform = Platform.LINKEDIN;
      posts.push({
        id: `post-${this.postIdCounter++}`,
        projectId,
        insightId: `insight-${Math.floor(Math.random() * insightCount) + 1}`,
        platform,
        content: this.generateMockPostContent(platform),
        hashtags: this.generateRandomHashtags(),
        characterCount: Math.floor(Math.random() * 280) + 50,
        isApproved: Math.random() > 0.4,
        reviewedBy: Math.random() > 0.4 ? 'reviewer@example.com' : undefined,
        reviewedAt: Math.random() > 0.4 ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return posts;
  }
  
  private generateMockPostContent(platform: Platform): string {
    const contents: Record<Platform, string[]> = {
      [Platform.LINKEDIN]: [
        '🚀 Excited to share insights from our latest analysis on AI transformation in the workplace...',
        '💡 Key takeaway from today\'s discussion: Innovation happens at the intersection of technology and human creativity.',
        '📊 New data reveals surprising trends in content consumption patterns for 2024.'
      ]
    };
    
    const platformContents = contents[platform];
    return platformContents[Math.floor(Math.random() * platformContents.length)];
  }
  
  private generateRandomTags(): string[] {
    const allTags = ['AI', 'Technology', 'Innovation', 'Leadership', 'Marketing', 
                      'Strategy', 'Growth', 'Productivity', 'Insights', 'Trends'];
    const numTags = Math.floor(Math.random() * 4) + 1;
    const tags: string[] = [];
    
    for (let i = 0; i < numTags; i++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  private generateRandomHashtags(): string[] {
    const hashtags = ['#AI', '#Innovation', '#TechTrends', '#Leadership', '#Growth',
                      '#ContentMarketing', '#DigitalTransformation', '#FutureOfWork'];
    const numHashtags = Math.floor(Math.random() * 5) + 2;
    return hashtags.slice(0, numHashtags);
  }
  
  private generateRandomPlatforms(): Platform[] {
    return [Platform.LINKEDIN];
  }
  
  // Public API Methods
  
  getProjects(): Observable<ContentProject[]> {
    return this.projectsSubject.asObservable().pipe(
      delay(500) // Simulate network delay
    );
  }
  
  getProject(id: string): Observable<ContentProject> {
    return this.projectsSubject.pipe(
      map(projects => {
        const project = projects.find(p => p.id === id);
        if (!project) {
          throw new Error(`Project ${id} not found`);
        }
        return project;
      }),
      delay(300)
    );
  }
  
  createProject(data: any): Observable<ContentProject> {
    const newProject = this.createMockProject(
      data.title,
      data.description || '',
      ProjectStage.RAW_CONTENT,
      0
    );
    
    const currentProjects = this.projectsSubject.value;
    this.projectsSubject.next([newProject, ...currentProjects]);
    
    return of(newProject).pipe(delay(500));
  }
  
  updateProject(id: string, updates: Partial<ContentProject>): Observable<ContentProject> {
    const projects = this.projectsSubject.value;
    const index = projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error(`Project ${id} not found`);
    }
    
    const updated = { ...projects[index], ...updates, updatedAt: new Date() };
    projects[index] = updated;
    this.projectsSubject.next([...projects]);
    
    return of(updated).pipe(delay(300));
  }
  
  deleteProject(id: string): Observable<void> {
    const projects = this.projectsSubject.value.filter(p => p.id !== id);
    this.projectsSubject.next(projects);
    return of(void 0).pipe(delay(300));
  }
  
  processContent(projectId: string): Observable<ProcessingJob> {
    this.updateProjectStage(projectId, ProjectStage.PROCESSING_CONTENT, 25);
    
    return of({
      id: `job-${Date.now()}`,
      projectId,
      type: 'PROCESS_CONTENT',
      status: 'PROCESSING',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ProcessingJob).pipe(delay(500));
  }
  
  extractInsights(projectId: string): Observable<ProcessingJob> {
    this.updateProjectStage(projectId, ProjectStage.INSIGHTS_READY, 50);
    
    return of({
      id: `job-${Date.now()}`,
      projectId,
      type: 'EXTRACT_INSIGHTS',
      status: 'PROCESSING',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ProcessingJob).pipe(delay(500));
  }
  
  generatePosts(projectId: string): Observable<ProcessingJob> {
    this.updateProjectStage(projectId, ProjectStage.POSTS_GENERATED, 75);
    
    return of({
      id: `job-${Date.now()}`,
      projectId,
      type: 'GENERATE_POSTS',
      status: 'PROCESSING',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ProcessingJob).pipe(delay(500));
  }
  
  approveInsights(projectId: string, insightIds: string[]): Observable<Insight[]> {
    const projects = this.projectsSubject.value;
    const project = projects.find(p => p.id === projectId);
    
    if (project?.insights) {
      project.insights.forEach(insight => {
        if (insightIds.includes(insight.id)) {
          insight.isApproved = true;
          insight.reviewedBy = 'user@example.com';
          insight.reviewedAt = new Date();
        }
      });
      
      this.updateProjectStage(projectId, ProjectStage.INSIGHTS_APPROVED, 65);
      this.projectsSubject.next([...projects]);
    }
    
    return of(project?.insights || []).pipe(delay(300));
  }
  
  approvePosts(projectId: string, postIds: string[]): Observable<Post[]> {
    const projects = this.projectsSubject.value;
    const project = projects.find(p => p.id === projectId);
    
    if (project?.posts) {
      project.posts.forEach(post => {
        if (postIds.includes(post.id)) {
          post.isApproved = true;
          post.reviewedBy = 'user@example.com';
          post.reviewedAt = new Date();
        }
      });
      
      this.updateProjectStage(projectId, ProjectStage.POSTS_APPROVED, 85);
      this.projectsSubject.next([...projects]);
    }
    
    return of(project?.posts || []).pipe(delay(300));
  }
  
  private updateProjectStage(projectId: string, stage: ProjectStage, progress: number): void {
    const projects = this.projectsSubject.value;
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
      project.currentStage = stage;
      project.overallProgress = progress;
      project.updatedAt = new Date();
      project.lastActivityAt = new Date();
      
      // Generate mock data based on new stage
      if (stage === ProjectStage.INSIGHTS_READY && !project.insights) {
        project.insights = this.generateMockInsights(projectId, 8);
      }
      if (stage === ProjectStage.POSTS_GENERATED && !project.posts) {
        project.posts = this.generateMockPosts(projectId, project.insights?.length || 8);
      }
      
      this.projectsSubject.next([...projects]);
    }
  }
  
  getDashboardData(): Observable<any> {
    const projects = this.projectsSubject.value;
    
    const byStage: Record<ProjectStage, number> = {} as any;
    Object.values(ProjectStage).forEach(stage => {
      byStage[stage] = projects.filter(p => p.currentStage === stage).length;
    });
    
    return of({
      projectOverview: {
        total: projects.length,
        byStage,
        recentActivity: projects.slice(0, 5)
      },
      actionItems: {
        insightsNeedingReview: projects.filter(p => p.currentStage === ProjectStage.INSIGHTS_READY).length,
        postsNeedingReview: projects.filter(p => p.currentStage === ProjectStage.POSTS_GENERATED).length,
        readyToSchedule: projects.filter(p => p.currentStage === ProjectStage.POSTS_APPROVED).length,
        failedJobs: 0
      }
    }).pipe(delay(300));
  }
  
  getActionItems(): Observable<ContentProject[]> {
    return this.projectsSubject.pipe(
      map(projects => projects.filter(p => 
        p.currentStage === ProjectStage.INSIGHTS_READY ||
        p.currentStage === ProjectStage.POSTS_GENERATED ||
        p.currentStage === ProjectStage.POSTS_APPROVED
      )),
      delay(300)
    );
  }
}