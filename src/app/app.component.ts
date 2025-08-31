import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemeService } from './services/theme.service';
import { environment } from '../environment';
import { AppLauncherComponent } from './components/app-launcher.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AppLauncherComponent],
  template: `
    <header class="bg-background border-b border-accent-dark backdrop-blur-md sticky top-0 z-[1000] transition-all duration-300">
      <nav class="flex items-center justify-between max-w-6xl mx-auto px-6 h-16">
        <div class="flex items-center">
          <app-launcher></app-launcher>
        </div>
        <div class="flex items-center gap-4">
          <button 
            class="flex items-center justify-center w-11 h-11 border border-secondary-border rounded-xl bg-surface-card text-header-text cursor-pointer transition-all duration-300 ease-out relative overflow-hidden shadow-sm opacity-80 hover:bg-surface-hover hover:border-accent hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 md:w-10 md:h-10"
            (click)="toggleTheme()" 
            [attr.aria-label]="'Switch to ' + (isDarkTheme() ? 'light' : 'dark') + ' theme'"
            [title]="'Switch to ' + (isDarkTheme() ? 'light' : 'dark') + ' theme'"
          >
            <div class="relative flex items-center justify-center transition-transform duration-500 ease-out hover:rotate-180">
              @if (isDarkTheme()) {
                <img src="assets/images/sun.svg" alt="Switch to light theme" class="w-5 h-5 transition-all duration-300 hover:scale-110 filter brightness-0 invert">
              } @else {
                <img src="assets/images/moon.svg" alt="Switch to dark theme" class="w-5 h-5 transition-all duration-300 hover:scale-110 dark:filter dark:brightness-0 dark:invert">
              }
            </div>
          </button>
        </div>
      </nav>
    </header>

    <main class="min-h-[calc(100vh-120px)] flex-1">
      <router-outlet />
    </main>

    <footer class="bg-background border-t border-accent-dark mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">

  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 text-center sm:text-left">
          <p class="text-text-secondary text-xs opacity-70 order-2 sm:order-1">
            © {{ currentYear }} Angor Profile. All rights reserved.
          </p>
          <div class="flex flex-col xs:flex-row items-center gap-2 xs:gap-3 sm:gap-4 lg:gap-6 order-1 sm:order-2">
            <div class="flex items-center gap-3 sm:gap-4 lg:gap-6">
              <a href="https://angor.io/terms/" class="text-text-secondary text-xs transition-all duration-200 opacity-70 hover:text-accent hover:opacity-100">Terms</a>
              <a href="https://angor.io/privacy/" class="text-text-secondary text-xs transition-all duration-200 opacity-70 hover:text-accent hover:opacity-100">Privacy</a>
              <span class="text-text-secondary text-xs opacity-50 font-mono bg-surface-card px-2 py-1 rounded border border-secondary-border">v{{ version }}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class AppComponent {
  title = 'angor-profile';
  version = environment.appVersion;
  currentYear = new Date().getFullYear();

  private themeService = inject(ThemeService);
  private _themeSignal = toSignal(this.themeService.theme$, { 
    initialValue: 'light' 
  });

  isDarkTheme = computed(() => this._themeSignal() === 'dark');

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}