import { Component, OnInit, OnDestroy, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { WorkflowService, WorkflowStats, SystemHealth } from '../../../core/services/workflow.service';
import { SSEService, WorkflowEvent } from '../../../core/services/sse.service';

@Component({
  selector: 'app-workflow-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'bg-white rounded-lg shadow-md ' + className">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex items-center">
              <i class="pi pi-server text-2xl text-gray-700 mr-2"></i>
              <h3 class="text-lg font-semibold text-gray-800">Workflow System Monitor</h3>
            </div>
            <!-- Connection Status -->
            <div class="flex items-center space-x-2">
              <div 
                class="w-2 h-2 rounded-full animate-pulse"
                [class.bg-green-500]="isConnected()"
                [class.bg-red-500]="!isConnected()"
              ></div>
              <span class="text-xs text-gray-500">
                {{ isConnected() ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
          </div>
          
          <!-- Control Buttons -->
          <div class="flex items-center space-x-2">
            <button
              (click)="toggleAutoRefresh()"
              class="px-3 py-1 text-sm border rounded-lg transition-colors"
              [class.bg-blue-50]="autoRefresh"
              [class.border-blue-300]="autoRefresh"
              [class.text-blue-700]="autoRefresh"
              [class.bg-gray-50]="!autoRefresh"
              [class.border-gray-300]="!autoRefresh"
              [class.text-gray-700]="!autoRefresh"
            >
              <i class="pi pi-refresh mr-1"></i>
              Auto-refresh {{ autoRefresh ? 'ON' : 'OFF' }}
            </button>
            <button
              (click)="fetchData()"
              class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
            >
              <i class="pi pi-sync"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- System Health -->
      <div class="px-6 py-4 border-b border-gray-200" *ngIf="systemHealth()">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-700">System Health</h4>
          <div class="flex items-center space-x-4">
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-2"
                [class.bg-green-500]="systemHealth()?.redis"
                [class.bg-red-500]="!systemHealth()?.redis"
              ></div>
              <span class="text-sm text-gray-600">Redis</span>
            </div>
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-2"
                [class.bg-green-500]="systemHealth()?.queues?.publisher"
                [class.bg-red-500]="!systemHealth()?.queues?.publisher"
              ></div>
              <span class="text-sm text-gray-600">Publisher Queue</span>
            </div>
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-2"
                [class.bg-green-500]="systemHealth()?.processors?.publisher"
                [class.bg-red-500]="!systemHealth()?.processors?.publisher"
              ></div>
              <span class="text-sm text-gray-600">Publisher Processor</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading State -->
      <div *ngIf="isLoading()" class="px-6 py-8 text-center">
        <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
        <p class="mt-2 text-gray-500">Loading workflow stats...</p>
      </div>
      
      <!-- Stats Grid -->
      <div *ngIf="!isLoading() && stats()" class="p-6">
        <!-- Queue Stats -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Queue Statistics</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Active</span>
                <i class="pi pi-play text-green-500"></i>
              </div>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats()?.jobs?.active || 0 }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Waiting</span>
                <i class="pi pi-clock text-yellow-500"></i>
              </div>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats()?.jobs?.waiting || 0 }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Completed</span>
                <i class="pi pi-check-circle text-green-500"></i>
              </div>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats()?.jobs?.completed || 0 }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Failed</span>
                <i class="pi pi-times-circle text-red-500"></i>
              </div>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats()?.jobs?.failed || 0 }}</p>
            </div>
          </div>
        </div>
        
        <!-- Performance Metrics -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Performance</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-blue-50 rounded-lg p-3">
              <span class="text-xs text-blue-600">Jobs/Minute</span>
              <p class="text-xl font-bold text-blue-800 mt-1">
                {{ stats()?.performance?.jobsPerMinute?.toFixed(1) || '0' }}
              </p>
            </div>
            <div class="bg-purple-50 rounded-lg p-3">
              <span class="text-xs text-purple-600">Avg Processing Time</span>
              <p class="text-xl font-bold text-purple-800 mt-1">
                {{ formatDuration(stats()?.performance?.avgProcessingTime || 0) }}
              </p>
            </div>
            <div class="bg-green-50 rounded-lg p-3">
              <span class="text-xs text-green-600">Success Rate</span>
              <p class="text-xl font-bold text-green-800 mt-1">
                {{ (stats()?.performance?.successRate || 0) * 100 | number:'1.0-0' }}%
              </p>
            </div>
          </div>
        </div>
        
        <!-- Control Actions -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-700 mb-3">System Controls</h4>
          <div class="flex flex-wrap gap-2">
            <button
              (click)="pauseAllProcessing()"
              class="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm transition-colors flex items-center"
            >
              <i class="pi pi-pause mr-1"></i>
              Pause All
            </button>
            <button
              (click)="resumeAllProcessing()"
              class="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm transition-colors flex items-center"
            >
              <i class="pi pi-play mr-1"></i>
              Resume All
            </button>
            <button
              (click)="retryFailed()"
              class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm transition-colors flex items-center"
            >
              <i class="pi pi-refresh mr-1"></i>
              Retry Failed
            </button>
            <button
              (click)="clearCompleted()"
              class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm transition-colors flex items-center"
            >
              <i class="pi pi-trash mr-1"></i>
              Clear Completed
            </button>
            <button
              (click)="clearFailed()"
              class="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm transition-colors flex items-center"
            >
              <i class="pi pi-trash mr-1"></i>
              Clear Failed
            </button>
          </div>
        </div>
        
        <!-- Recent Events -->
        <div *ngIf="recentEvents().length > 0">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Recent Events</h4>
          <div class="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div 
              *ngFor="let event of recentEvents()"
              class="flex items-start space-x-2 py-1.5 border-b border-gray-200 last:border-0"
            >
              <span class="text-lg">{{ getEventIcon(event) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800">
                  {{ formatEventType(event.type) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatEventTime(event.timestamp) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class WorkflowMonitorComponent implements OnInit, OnDestroy {
  @Input() className = '';
  @Input() autoRefresh = true;
  @Input() refreshInterval = 30000; // 30 seconds
  
  private workflowService = inject(WorkflowService);
  private sseService = inject(SSEService);
  
  // State signals
  stats = signal<WorkflowStats | null>(null);
  systemHealth = signal<SystemHealth | null>(null);
  isLoading = signal(true);
  recentEvents = signal<WorkflowEvent[]>([]);
  isConnected = signal(false);
  
  // Subscriptions
  private refreshSubscription?: Subscription;
  private sseConnection?: any;
  
  ngOnInit(): void {
    this.fetchData();
    this.setupSSEConnection();
    
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }
  
  ngOnDestroy(): void {
    this.stopAutoRefresh();
    if (this.sseConnection) {
      this.sseConnection.cleanup();
    }
  }
  
  fetchData(): void {
    this.isLoading.set(true);
    
    // Fetch stats and health in parallel
    Promise.all([
      this.workflowService.getStats().toPromise(),
      this.workflowService.getHealth().toPromise()
    ]).then(([statsResult, healthResult]) => {
      if (statsResult?.success) {
        this.stats.set(statsResult.data || null);
      }
      if (healthResult?.success) {
        this.systemHealth.set(healthResult.data || null);
      }
      this.isLoading.set(false);
    }).catch(error => {
      console.error('Failed to fetch workflow data:', error);
      this.isLoading.set(false);
    });
  }
  
  setupSSEConnection(): void {
    this.sseConnection = this.sseService.createWorkflowSSEConnection(
      (event) => {
        // Add to recent events
        const events = this.recentEvents();
        this.recentEvents.set([event, ...events.slice(0, 9)]); // Keep last 10
      },
      (error) => {
        console.error('SSE connection error:', error);
        this.isConnected.set(false);
      },
      () => {
        console.log('SSE connection established');
        this.isConnected.set(true);
      }
    );
  }
  
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }
  
  startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
      this.fetchData();
    });
  }
  
  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }
  
  pauseAllProcessing(): void {
    this.workflowService.pauseAll().subscribe(result => {
      if (result.success) {
        console.log('All processing paused');
        this.fetchData();
      }
    });
  }
  
  resumeAllProcessing(): void {
    this.workflowService.resumeAll().subscribe(result => {
      if (result.success) {
        console.log('All processing resumed');
        this.fetchData();
      }
    });
  }
  
  retryFailed(): void {
    this.workflowService.retryFailed().subscribe(result => {
      if (result.success) {
        console.log('Failed jobs retried:', result.data);
        this.fetchData();
      }
    });
  }
  
  clearCompleted(): void {
    this.workflowService.clearCompleted().subscribe(result => {
      if (result.success) {
        console.log('Completed jobs cleared:', result.data);
        this.fetchData();
      }
    });
  }
  
  clearFailed(): void {
    this.workflowService.clearFailed().subscribe(result => {
      if (result.success) {
        console.log('Failed jobs cleared:', result.data);
        this.fetchData();
      }
    });
  }
  
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
  
  formatEventType(type: string): string {
    return type.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  formatEventTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
  
  getEventIcon(event: WorkflowEvent): string {
    if (event.type.includes('completed')) return '✅';
    if (event.type.includes('failed')) return '❌';
    if (event.type.includes('started')) return '🚀';
    if (event.type.includes('progress')) return '⏳';
    if (event.type.includes('blocked')) return '🚧';
    return '📋';
  }
}