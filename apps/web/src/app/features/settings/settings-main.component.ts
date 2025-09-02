import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TabMenuModule } from 'primeng/tabmenu';
import { MenuItem } from 'primeng/api';
import { GeneralSettingsComponent } from './general-settings/general-settings.component';
import { IntegrationsSettingsComponent } from './integrations-settings/integrations-settings.component';
import { AutomationSettingsComponent } from './automation-settings/automation-settings.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';

@Component({
  selector: 'app-settings-main',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    TabMenuModule,
    GeneralSettingsComponent,
    IntegrationsSettingsComponent,
    AutomationSettingsComponent,
    AccountSettingsComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-6xl mx-auto px-4">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
          <p class="mt-2 text-gray-600">Manage your application preferences and configurations</p>
        </div>

        <!-- Tab Navigation -->
        <div class="bg-white rounded-lg shadow mb-6">
          <p-tabMenu 
            [model]="tabItems" 
            [activeItem]="activeTab()"
            (activeItemChange)="onTabChange($event)"
          />
        </div>

        <!-- Content -->
        <div class="bg-white rounded-lg shadow">
          <div [ngSwitch]="activeTabIndex()">
            <app-general-settings *ngSwitchCase="0" />
            <app-integrations-settings *ngSwitchCase="1" />
            <app-automation-settings *ngSwitchCase="2" />
            <app-account-settings *ngSwitchCase="3" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    ::ng-deep .p-tabmenu {
      border: none;
      background: transparent;
    }
    
    ::ng-deep .p-tabmenu .p-tabmenu-nav {
      border: none;
      background: transparent;
    }
    
    ::ng-deep .p-tabmenu .p-tabmenuitem {
      margin-right: 0.5rem;
    }
    
    ::ng-deep .p-tabmenu .p-menuitem-link {
      border: none;
      background: transparent;
      color: #6b7280;
      transition: all 0.2s;
    }
    
    ::ng-deep .p-tabmenu .p-menuitem-link:hover {
      background: #f3f4f6;
      color: #111827;
    }
    
    ::ng-deep .p-tabmenu .p-menuitem-link:focus {
      box-shadow: none;
    }
    
    ::ng-deep .p-tabmenu .p-highlight .p-menuitem-link {
      background: transparent;
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
    }
  `]
})
export class SettingsMainComponent {
  activeTab = signal<MenuItem | null>(null);
  activeTabIndex = signal(0);

  tabItems: MenuItem[] = [
    { 
      label: 'General', 
      icon: 'pi pi-cog',
      command: () => this.setActiveTab(0)
    },
    { 
      label: 'Integrations', 
      icon: 'pi pi-link',
      command: () => this.setActiveTab(1)
    },
    { 
      label: 'Automation', 
      icon: 'pi pi-bolt',
      command: () => this.setActiveTab(2)
    },
    { 
      label: 'Account', 
      icon: 'pi pi-user',
      command: () => this.setActiveTab(3)
    }
  ];

  constructor() {
    this.activeTab.set(this.tabItems[0]);
  }

  onTabChange(item: MenuItem): void {
    this.activeTab.set(item);
    const index = this.tabItems.indexOf(item);
    if (index >= 0) {
      this.activeTabIndex.set(index);
    }
  }

  setActiveTab(index: number): void {
    this.activeTabIndex.set(index);
    this.activeTab.set(this.tabItems[index]);
  }
}