import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
      
      <div class="bg-white rounded-lg shadow">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button class="px-6 py-3 border-b-2 border-blue-500 text-blue-600 font-medium">
              General
            </button>
            <button class="px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Integrations
            </button>
            <button class="px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Automation
            </button>
            <button class="px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              Account
            </button>
          </nav>
        </div>
        
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-4">General Settings</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Default Project Template
              </label>
              <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Standard Content Pipeline</option>
                <option>Quick Social Posts</option>
                <option>Long-form Content</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Auto-approval Threshold
              </label>
              <input 
                type="number" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum score for auto-approval"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Default Platforms
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="checkbox" class="mr-2" checked />
                  <span>LinkedIn</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" class="mr-2" checked />
                  <span>Twitter</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" class="mr-2" />
                  <span>Threads</span>
                </label>
                <label class="flex items-center">
                  <input type="checkbox" class="mr-2" />
                  <span>Bluesky</span>
                </label>
              </div>
            </div>
            
            <div class="pt-4">
              <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent {}