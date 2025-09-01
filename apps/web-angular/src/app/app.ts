import { Component } from '@angular/core';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainLayoutComponent],
  template: `<app-main-layout />`,
  styleUrl: './app.css'
})
export class App {
  title = 'Content Hub';
}
