import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentProject, Insight, Post, Transcript } from '../../../core/models/project.model';

interface TreeNode {
  id: string;
  label: string;
  type: 'project' | 'transcript' | 'insight' | 'post';
  data: any;
  expanded: boolean;
  children: TreeNode[];
  status?: string;
  count?: number;
}

@Component({
  selector: 'app-content-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow">
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">Content Structure</h2>
          <div class="flex items-center space-x-2">
            <button
              (click)="expandAll()"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              <i class="pi pi-plus-circle mr-1"></i>
              Expand All
            </button>
            <button
              (click)="collapseAll()"
              class="text-sm text-gray-600 hover:text-gray-800"
            >
              <i class="pi pi-minus-circle mr-1"></i>
              Collapse All
            </button>
          </div>
        </div>
      </div>
      
      <div class="p-4">
        <div class="tree-container">
          <ng-container *ngFor="let node of treeNodes">
            <div class="tree-node" [class.ml-4]="false">
              <ng-container *ngTemplateOutlet="nodeTemplate; context: { node: node, level: 0 }"></ng-container>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
    
    <!-- Recursive Node Template -->
    <ng-template #nodeTemplate let-node="node" let-level="level">
      <div 
        class="tree-item"
        [class.cursor-pointer]="node.children.length > 0 || node.type !== 'project'"
        (click)="handleNodeClick(node)"
      >
        <div class="flex items-center space-x-2 py-2 px-3 rounded hover:bg-gray-50 transition-colors">
          <!-- Expand/Collapse Icon -->
          <i 
            *ngIf="node.children.length > 0"
            class="pi text-gray-400 cursor-pointer"
            [ngClass]="node.expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
            (click)="toggleNode(node, $event)"
          ></i>
          <span *ngIf="node.children.length === 0" class="w-4"></span>
          
          <!-- Node Icon -->
          <i [class]="getNodeIcon(node)"></i>
          
          <!-- Node Label -->
          <span class="flex-1 text-sm text-gray-700">
            {{ node.label }}
            <span *ngIf="node.count !== undefined" class="ml-1 text-gray-500">
              ({{ node.count }})
            </span>
          </span>
          
          <!-- Status Indicator -->
          <span 
            *ngIf="node.status"
            class="px-2 py-1 text-xs rounded-full"
            [ngClass]="getStatusClass(node.status)"
          >
            {{ formatStatus(node.status) }}
          </span>
        </div>
      </div>
      
      <!-- Children -->
      <div 
        *ngIf="node.expanded && node.children.length > 0"
        class="ml-6 border-l border-gray-200"
      >
        <div *ngFor="let child of node.children" class="tree-node">
          <ng-container *ngTemplateOutlet="nodeTemplate; context: { node: child, level: level + 1 }"></ng-container>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .tree-container {
      font-family: inherit;
    }
    
    .tree-item {
      user-select: none;
    }
    
    .tree-node {
      position: relative;
    }
    
    .tree-node::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 20px;
      width: 12px;
      height: 1px;
      background-color: #e5e7eb;
    }
    
    .tree-node:last-child::after {
      content: '';
      position: absolute;
      left: -12px;
      top: 0;
      bottom: 20px;
      width: 1px;
      background-color: white;
    }
  `]
})
export class ContentTreeComponent {
  @Input() project!: ContentProject;
  @Input() insights: Insight[] = [];
  @Input() posts: Post[] = [];
  @Output() nodeSelected = new EventEmitter<any>();
  
  treeNodes: TreeNode[] = [];
  
  ngOnChanges(): void {
    this.buildTree();
  }
  
  ngOnInit(): void {
    this.buildTree();
  }
  
  buildTree(): void {
    if (!this.project) return;
    
    const rootNode: TreeNode = {
      id: this.project.id,
      label: this.project.title,
      type: 'project',
      data: this.project,
      expanded: true,
      children: [],
      status: this.project.currentStage
    };
    
    // Add transcript node
    if (this.project.transcript) {
      const transcriptNode: TreeNode = {
        id: this.project.transcript.id,
        label: 'Transcript',
        type: 'transcript',
        data: this.project.transcript,
        expanded: true,
        children: [],
        status: this.project.transcript.status
      };
      
      // Group insights by transcript
      const transcriptInsights = this.insights.filter(
        i => i.transcriptId === this.project.transcript?.id
      );
      
      if (transcriptInsights.length > 0) {
        const insightsNode: TreeNode = {
          id: `insights-${this.project.transcript.id}`,
          label: 'Insights',
          type: 'insight',
          data: null,
          expanded: true,
          children: [],
          count: transcriptInsights.length
        };
        
        // Add individual insights
        transcriptInsights.forEach(insight => {
          const insightNode: TreeNode = {
            id: insight.id,
            label: this.truncateText(insight.content, 50),
            type: 'insight',
            data: insight,
            expanded: false,
            children: [],
            status: insight.isApproved ? 'approved' : 'pending'
          };
          
          // Add posts for this insight
          const insightPosts = this.posts.filter(p => p.insightId === insight.id);
          if (insightPosts.length > 0) {
            insightPosts.forEach(post => {
              const postNode: TreeNode = {
                id: post.id,
                label: `${this.getPlatformLabel(post.platform)} Post`,
                type: 'post',
                data: post,
                expanded: false,
                children: [],
                status: post.isApproved ? 'approved' : 'pending'
              };
              insightNode.children.push(postNode);
            });
          }
          
          insightsNode.children.push(insightNode);
        });
        
        transcriptNode.children.push(insightsNode);
      }
      
      rootNode.children.push(transcriptNode);
    }
    
    // Add orphaned posts (posts without insights)
    const orphanedPosts = this.posts.filter(
      p => !this.insights.find(i => i.id === p.insightId)
    );
    
    if (orphanedPosts.length > 0) {
      const postsNode: TreeNode = {
        id: 'posts-orphaned',
        label: 'Direct Posts',
        type: 'post',
        data: null,
        expanded: true,
        children: [],
        count: orphanedPosts.length
      };
      
      orphanedPosts.forEach(post => {
        const postNode: TreeNode = {
          id: post.id,
          label: `${this.getPlatformLabel(post.platform)} Post`,
          type: 'post',
          data: post,
          expanded: false,
          children: [],
          status: post.isApproved ? 'approved' : 'pending'
        };
        postsNode.children.push(postNode);
      });
      
      rootNode.children.push(postsNode);
    }
    
    this.treeNodes = [rootNode];
  }
  
  toggleNode(node: TreeNode, event: Event): void {
    event.stopPropagation();
    node.expanded = !node.expanded;
  }
  
  handleNodeClick(node: TreeNode): void {
    if (node.type !== 'project' && node.data) {
      this.nodeSelected.emit({
        type: node.type,
        data: node.data
      });
    }
  }
  
  expandAll(): void {
    this.expandNodes(this.treeNodes);
  }
  
  collapseAll(): void {
    this.collapseNodes(this.treeNodes);
  }
  
  private expandNodes(nodes: TreeNode[]): void {
    nodes.forEach(node => {
      node.expanded = true;
      if (node.children.length > 0) {
        this.expandNodes(node.children);
      }
    });
  }
  
  private collapseNodes(nodes: TreeNode[]): void {
    nodes.forEach(node => {
      node.expanded = false;
      if (node.children.length > 0) {
        this.collapseNodes(node.children);
      }
    });
  }
  
  getNodeIcon(node: TreeNode): string {
    const icons: Record<string, string> = {
      'project': 'pi pi-folder text-blue-600',
      'transcript': 'pi pi-file-text text-purple-600',
      'insight': 'pi pi-lightbulb text-yellow-600',
      'post': 'pi pi-send text-green-600'
    };
    return icons[node.type] || 'pi pi-circle text-gray-400';
  }
  
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'approved': 'bg-green-100 text-green-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'processing': 'bg-blue-100 text-blue-700',
      'failed': 'bg-red-100 text-red-700',
      'completed': 'bg-gray-100 text-gray-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }
  
  formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
  
  getPlatformLabel(platform: string): string {
    const labels: Record<string, string> = {
      'LINKEDIN': 'LinkedIn',
      'TWITTER': 'X',
      'THREADS': 'Threads',
      'BLUESKY': 'Bluesky',
      'FACEBOOK': 'Facebook',
      'INSTAGRAM': 'Instagram'
    };
    return labels[platform] || platform;
  }
  
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}