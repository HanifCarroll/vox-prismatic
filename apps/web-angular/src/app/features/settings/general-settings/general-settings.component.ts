import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SliderModule } from 'primeng/slider';
import { NotificationService } from '../../../core/services/notification.service';
import { Platform } from '../../../core/models/project.model';

interface GeneralSettings {
  defaultTemplate: string;
  autoApprovalThreshold: number;
  defaultPlatforms: Platform[];
  defaultPostCount: number;
  enableNotifications: boolean;
  emailDigest: 'daily' | 'weekly' | 'never';
  darkMode: boolean;
  compactView: boolean;
  showTips: boolean;
  defaultView: 'card' | 'list' | 'kanban' | 'table';
}

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    InputNumberModule,
    MultiSelectModule,
    InputSwitchModule,
    SliderModule
  ],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-6">General Settings</h2>
      
      <div class="space-y-6">
        <!-- Project Defaults -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-medium mb-4">Project Defaults</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Default Project Template
              </label>
              <p-dropdown
                [(ngModel)]="settings.defaultTemplate"
                [options]="templateOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select a template"
                styleClass="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">
                Template to use when creating new projects
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Default Platforms
              </label>
              <p-multiSelect
                [(ngModel)]="settings.defaultPlatforms"
                [options]="platformOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select platforms"
                [showClear]="true"
                styleClass="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">
                Pre-selected platforms for new projects
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Auto-Approval Threshold
              </label>
              <div class="flex items-center space-x-4">
                <p-slider
                  [(ngModel)]="settings.autoApprovalThreshold"
                  [min]="1"
                  [max]="10"
                  [step]="1"
                  styleClass="flex-1"
                />
                <span class="text-sm font-medium w-8">{{ settings().autoApprovalThreshold }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Minimum score for automatic insight approval
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Default Posts Per Insight
              </label>
              <p-inputNumber
                [(ngModel)]="settings.defaultPostCount"
                [min]="1"
                [max]="10"
                [showButtons]="true"
                buttonLayout="horizontal"
                styleClass="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">
                Number of posts to generate per insight
              </p>
            </div>
          </div>
        </div>

        <!-- Display Preferences -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-medium mb-4">Display Preferences</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Default View Mode
              </label>
              <p-dropdown
                [(ngModel)]="settings.defaultView"
                [options]="viewOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select view"
                styleClass="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">
                Default view for project listings
              </p>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">Dark Mode</label>
                  <p class="text-xs text-gray-500">Use dark theme interface</p>
                </div>
                <p-inputSwitch [(ngModel)]="settings.darkMode" />
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">Compact View</label>
                  <p class="text-xs text-gray-500">Reduce spacing in lists</p>
                </div>
                <p-inputSwitch [(ngModel)]="settings.compactView" />
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">Show Tips</label>
                  <p class="text-xs text-gray-500">Display helpful hints</p>
                </div>
                <p-inputSwitch [(ngModel)]="settings.showTips" />
              </div>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-medium mb-4">Notifications</h3>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">Enable Notifications</label>
                <p class="text-xs text-gray-500">Receive in-app notifications for important events</p>
              </div>
              <p-inputSwitch [(ngModel)]="settings.enableNotifications" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Email Digest
              </label>
              <p-dropdown
                [(ngModel)]="settings.emailDigest"
                [options]="emailOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select frequency"
                styleClass="w-full md:w-64"
              />
              <p class="text-xs text-gray-500 mt-1">
                Receive summary of your content activity
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center">
          <button
            pButton
            label="Reset to Defaults"
            class="p-button-text p-button-danger"
            icon="pi pi-refresh"
            (click)="resetSettings()"
          ></button>
          
          <div class="space-x-3">
            <button
              pButton
              label="Cancel"
              class="p-button-outlined"
              (click)="cancelChanges()"
            ></button>
            <button
              pButton
              label="Save Changes"
              icon="pi pi-check"
              (click)="saveSettings()"
              [loading]="saving()"
            ></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    ::ng-deep .p-dropdown,
    ::ng-deep .p-multiselect,
    ::ng-deep .p-inputnumber {
      width: 100%;
    }
    
    ::ng-deep .p-slider {
      width: 100%;
    }
  `]
})
export class GeneralSettingsComponent {
  private notificationService = inject(NotificationService);
  
  saving = signal(false);
  settings = signal<GeneralSettings>({
    defaultTemplate: 'standard',
    autoApprovalThreshold: 7,
    defaultPlatforms: ['LINKEDIN', 'TWITTER'] as Platform[],
    defaultPostCount: 1,
    enableNotifications: true,
    emailDigest: 'weekly',
    darkMode: false,
    compactView: false,
    showTips: true,
    defaultView: 'card'
  });

  originalSettings!: GeneralSettings;

  templateOptions = [
    { label: 'Standard Content Pipeline', value: 'standard' },
    { label: 'Quick Social Posts', value: 'quick' },
    { label: 'Long-form Content', value: 'longform' },
    { label: 'Podcast/Video Processing', value: 'media' }
  ];

  platformOptions = [
    { label: 'LinkedIn', value: 'LINKEDIN' },
    { label: 'X (Twitter)', value: 'TWITTER' },
    { label: 'Threads', value: 'THREADS' },
    { label: 'Bluesky', value: 'BLUESKY' }
  ];

  viewOptions = [
    { label: 'Card View', value: 'card' },
    { label: 'List View', value: 'list' },
    { label: 'Kanban Board', value: 'kanban' },
    { label: 'Table View', value: 'table' }
  ];

  emailOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Never', value: 'never' }
  ];

  constructor() {
    this.loadSettings();
  }

  loadSettings(): void {
    // TODO: Load from API
    this.originalSettings = { ...this.settings() };
  }

  saveSettings(): void {
    this.saving.set(true);
    
    // TODO: Save to API
    setTimeout(() => {
      this.originalSettings = { ...this.settings() };
      this.saving.set(false);
      this.notificationService.success('Settings saved successfully');
    }, 1000);
  }

  cancelChanges(): void {
    this.settings.set({ ...this.originalSettings });
    this.notificationService.info('Changes discarded');
  }

  resetSettings(): void {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.settings.set({
        defaultTemplate: 'standard',
        autoApprovalThreshold: 7,
        defaultPlatforms: ['LINKEDIN', 'TWITTER'] as Platform[],
        defaultPostCount: 1,
        enableNotifications: true,
        emailDigest: 'weekly',
        darkMode: false,
        compactView: false,
        showTips: true,
        defaultView: 'card'
      });
      this.notificationService.info('Settings reset to defaults');
    }
  }
}