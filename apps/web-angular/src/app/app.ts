import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoComponent } from './demo.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DemoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('PrimeNG + Tailwind CSS Demo');
}
