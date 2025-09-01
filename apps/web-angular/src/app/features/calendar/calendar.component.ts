import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-900">Publishing Calendar</h1>
      
      <div class="bg-white rounded-lg shadow p-12 text-center">
        <i class="pi pi-calendar text-6xl text-gray-300 mb-4"></i>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Calendar View Coming Soon</h2>
        <p class="text-gray-500">
          View and manage your scheduled posts across all projects and platforms
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class CalendarComponent {}