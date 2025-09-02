import { Component, Input, Output, EventEmitter, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProjectCreationData } from '../project-creation-wizard.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-automation-preferences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CheckboxModule,
    SliderModule,
    InputNumberModule,
    SelectButtonModule
  ],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold mb-4">Automation Preferences</h2>
      <p class="text-gray-600">
        Configure how much of the workflow you want automated. You can always change these settings later.
      </p>

      <!-- Auto-Extract Insights -->
      <div class="border rounded-lg p-4 space-y-4">
        <div class="flex items-start space-x-3">
          <input
            type="checkbox"
            id="auto-extract"
            [(ngModel)]="autoExtractInsights"
            (ngModelChange)="onAutoExtractChange()"
            class="mt-1"
          />
          <label for="auto-extract" class="flex-1 cursor-pointer">
            <p class="font-medium text-gray-900">Auto-extract insights after processing</p>
            <p class="text-sm text-gray-600 mt-1">
              Automatically analyze content and extract key insights once transcription is complete
            </p>
          </label>
        </div>
        
        <!-- Insight Settings (shown when enabled) -->
        <div *ngIf="autoExtractInsights()" class="ml-7 space-y-3 pt-3 border-t">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">
              Minimum Insight Score
            </label>
            <div class="flex items-center space-x-4">
              <p-slider
                [(ngModel)]="insightMinScore"
                (ngModelChange)="onInsightScoreChange()"
                [min]="0"
                [max]="100"
                [step]="5"
                styleClass="flex-1"
              />
              <span class="text-sm font-medium w-12">{{ insightMinScore() }}</span>
            </div>
            <p class="text-xs text-gray-500">
              Only extract insights with a relevance score above this threshold
            </p>
          </div>
        </div>
      </div>

      <!-- Auto-Generate Posts -->
      <div class="border rounded-lg p-4 space-y-4">
        <div class="flex items-start space-x-3">
          <input
            type="checkbox"
            id="auto-generate"
            [(ngModel)]="autoGeneratePosts"
            (ngModelChange)="onAutoGenerateChange()"
            [disabled]="!autoExtractInsights()"
            class="mt-1"
          />
          <label for="auto-generate" class="flex-1 cursor-pointer">
            <p class="font-medium text-gray-900" [class.text-gray-400]="!autoExtractInsights()">
              Auto-generate posts from approved insights
            </p>
            <p class="text-sm text-gray-600 mt-1" [class.text-gray-400]="!autoExtractInsights()">
              Automatically create social media posts when insights are approved
            </p>
            <p *ngIf="!autoExtractInsights()" class="text-xs text-amber-600 mt-1">
              <i class="pi pi-info-circle mr-1"></i>
              Requires auto-extract insights to be enabled
            </p>
          </label>
        </div>
        
        <!-- Post Generation Settings (shown when enabled) -->
        <div *ngIf="autoGeneratePosts()" class="ml-7 space-y-3 pt-3 border-t">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">
              Posts Per Insight
            </label>
            <div class="flex items-center space-x-4">
              <p-inputNumber
                [(ngModel)]="postsPerInsight"
                (ngModelChange)="onPostsPerInsightChange()"
                [min]="1"
                [max]="5"
                [showButtons]="true"
                buttonLayout="horizontal"
                decrementButtonClass="p-button-sm"
                incrementButtonClass="p-button-sm"
                inputStyleClass="text-center w-20"
              />
              <p class="text-xs text-gray-500">
                Number of post variations to generate for each insight
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto-Schedule Posts -->
      <div class="border rounded-lg p-4 space-y-4">
        <div class="flex items-start space-x-3">
          <input
            type="checkbox"
            id="auto-schedule"
            [(ngModel)]="autoSchedule"
            (ngModelChange)="onAutoScheduleChange()"
            [disabled]="!autoGeneratePosts()"
            class="mt-1"
          />
          <label for="auto-schedule" class="flex-1 cursor-pointer">
            <p class="font-medium text-gray-900" [class.text-gray-400]="!autoGeneratePosts()">
              Auto-schedule approved posts
            </p>
            <p class="text-sm text-gray-600 mt-1" [class.text-gray-400]="!autoGeneratePosts()">
              Automatically add approved posts to your publishing calendar
            </p>
            <p *ngIf="!autoGeneratePosts()" class="text-xs text-amber-600 mt-1">
              <i class="pi pi-info-circle mr-1"></i>
              Requires auto-generate posts to be enabled
            </p>
          </label>
        </div>
        
        <!-- Scheduling Settings (shown when enabled) -->
        <div *ngIf="autoSchedule()" class="ml-7 space-y-3 pt-3 border-t">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">
              Scheduling Strategy
            </label>
            <div class="space-y-3">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="useOptimalTimes"
                  (ngModelChange)="onScheduleSettingsChange()"
                />
                <span class="text-sm">Use optimal posting times based on platform analytics</span>
              </label>
              
              <div class="space-y-2">
                <label class="text-sm text-gray-700">Spread posts over days:</label>
                <div class="flex items-center space-x-4">
                  <p-slider
                    [(ngModel)]="spreadOverDays"
                    (ngModelChange)="onScheduleSettingsChange()"
                    [min]="1"
                    [max]="14"
                    [step]="1"
                    styleClass="flex-1"
                  />
                  <span class="text-sm font-medium w-12">{{ spreadOverDays() }}</span>
                </div>
                <p class="text-xs text-gray-500">
                  Distribute posts across this many days to avoid overwhelming your audience
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Automation Summary -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="font-semibold text-gray-900 mb-3">Automation Summary</h4>
        <div class="space-y-2 text-sm">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full" 
                 [class.bg-green-500]="getAutomationLevel() > 0"
                 [class.bg-gray-300]="getAutomationLevel() === 0"></div>
            <span>Content Processing: </span>
            <span class="font-medium">Always automatic</span>
          </div>
          
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full" 
                 [class.bg-green-500]="autoExtractInsights()"
                 [class.bg-gray-300]="!autoExtractInsights()"></div>
            <span>Insight Extraction: </span>
            <span class="font-medium">{{ autoExtractInsights() ? 'Automatic' : 'Manual trigger required' }}</span>
          </div>
          
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full" 
                 [class.bg-green-500]="autoGeneratePosts()"
                 [class.bg-gray-300]="!autoGeneratePosts()"></div>
            <span>Post Generation: </span>
            <span class="font-medium">{{ autoGeneratePosts() ? 'Automatic after approval' : 'Manual trigger required' }}</span>
          </div>
          
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full" 
                 [class.bg-green-500]="autoSchedule()"
                 [class.bg-gray-300]="!autoSchedule()"></div>
            <span>Post Scheduling: </span>
            <span class="font-medium">{{ autoSchedule() ? 'Automatic' : 'Manual scheduling' }}</span>
          </div>
        </div>
        
        <!-- Automation Level Indicator -->
        <div class="mt-4 pt-4 border-t">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Automation Level</span>
            <span class="text-sm font-bold" [ngClass]="getAutomationLevelClass()">
              {{ getAutomationLevelText() }}
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              [ngClass]="getAutomationLevelBarClass()"
              [style.width.%]="getAutomationLevel()"
            ></div>
          </div>
        </div>
      </div>

      <!-- Tips -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-900 mb-2">
          <i class="pi pi-lightbulb mr-2"></i>
          Automation Tips
        </h4>
        <ul class="space-y-1 text-sm text-blue-800">
          <li>• Start with less automation if you're new to the platform</li>
          <li>• You can always manually trigger any automated step</li>
          <li>• All automated actions require your approval before publishing</li>
          <li>• Settings can be changed per-project after creation</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AutomationPreferencesComponent {
  @Input() data!: ProjectCreationData;
  @Output() dataChange = new EventEmitter<Partial<ProjectCreationData>>();

  autoExtractInsights = signal(true);
  autoGeneratePosts = signal(false);
  autoSchedule = signal(false);
  insightMinScore = signal(70);
  postsPerInsight = signal(2);
  useOptimalTimes = signal(true);
  spreadOverDays = signal(7);

  constructor() {
    // Initialize from input data
    effect(() => {
      if (this.data) {
        this.autoExtractInsights.set(this.data.autoExtractInsights);
        this.autoGeneratePosts.set(this.data.autoGeneratePosts);
        this.autoSchedule.set(this.data.autoSchedule);
        if (this.data.insightMinScore) this.insightMinScore.set(this.data.insightMinScore);
        if (this.data.postsPerInsight) this.postsPerInsight.set(this.data.postsPerInsight);
        if (this.data.scheduleSettings) {
          this.useOptimalTimes.set(this.data.scheduleSettings.optimalTimes);
          this.spreadOverDays.set(this.data.scheduleSettings.spreadOverDays);
        }
      }
    }, { allowSignalWrites: true });
  }

  onAutoExtractChange(): void {
    const value = this.autoExtractInsights();
    // If disabling auto-extract, disable dependent options
    if (!value) {
      this.autoGeneratePosts.set(false);
      this.autoSchedule.set(false);
    }
    
    this.dataChange.emit({
      autoExtractInsights: value,
      autoGeneratePosts: this.autoGeneratePosts(),
      autoSchedule: this.autoSchedule()
    });
  }

  onAutoGenerateChange(): void {
    const value = this.autoGeneratePosts();
    // If disabling auto-generate, disable dependent options
    if (!value) {
      this.autoSchedule.set(false);
    }
    
    this.dataChange.emit({
      autoGeneratePosts: value,
      autoSchedule: this.autoSchedule()
    });
  }

  onAutoScheduleChange(): void {
    this.dataChange.emit({
      autoSchedule: this.autoSchedule()
    });
  }

  onInsightScoreChange(): void {
    this.dataChange.emit({
      insightMinScore: this.insightMinScore()
    });
  }

  onPostsPerInsightChange(): void {
    this.dataChange.emit({
      postsPerInsight: this.postsPerInsight()
    });
  }

  onScheduleSettingsChange(): void {
    this.dataChange.emit({
      scheduleSettings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        optimalTimes: this.useOptimalTimes(),
        spreadOverDays: this.spreadOverDays()
      }
    });
  }

  getAutomationLevel(): number {
    let level = 25; // Base level for processing
    if (this.autoExtractInsights()) level += 25;
    if (this.autoGeneratePosts()) level += 25;
    if (this.autoSchedule()) level += 25;
    return level;
  }

  getAutomationLevelText(): string {
    const level = this.getAutomationLevel();
    if (level <= 25) return 'Manual';
    if (level <= 50) return 'Semi-Automatic';
    if (level <= 75) return 'Mostly Automatic';
    return 'Fully Automatic';
  }

  getAutomationLevelClass(): string {
    const level = this.getAutomationLevel();
    if (level <= 25) return 'text-gray-600';
    if (level <= 50) return 'text-yellow-600';
    if (level <= 75) return 'text-blue-600';
    return 'text-green-600';
  }

  getAutomationLevelBarClass(): string {
    const level = this.getAutomationLevel();
    if (level <= 25) return 'bg-gray-400';
    if (level <= 50) return 'bg-yellow-400';
    if (level <= 75) return 'bg-blue-500';
    return 'bg-green-500';
  }
}