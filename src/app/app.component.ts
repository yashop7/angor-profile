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
    <header class="app-header">
      <nav class="nav-container">
        <div class="nav-brand">
          <app-launcher></app-launcher>
        </div>
        <div class="nav-actions">
          <button 
            class="theme-toggle-btn" 
            (click)="toggleTheme()" 
            [attr.aria-label]="'Switch to ' + (isDarkTheme() ? 'light' : 'dark') + ' theme'"
            [title]="'Switch to ' + (isDarkTheme() ? 'light' : 'dark') + ' theme'"
          >
            <div class="theme-icon-wrapper">
              @if (isDarkTheme()) {
                <img src="assets/images/sun.svg" alt="Switch to light theme" class="theme-icon">
              } @else {
                <img src="assets/images/moon.svg" alt="Switch to dark theme" class="theme-icon">
              }
            </div>
          </button>
        </div>
      </nav>
    </header>

    <main class="main-content">
      <router-outlet />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-main">
          <div class="footer-brand">
            <img 
              src="images/logo.svg" 
              alt="Angor Logo" 
              class="footer-logo"
              loading="lazy"
            >
            <p class="footer-description">
              A decentralized P2P funding protocol built on Bitcoin and Nostr for transparent project financing.
            </p>
          </div>

          <div class="footer-sections">
            <div class="footer-section">
              <h3 class="footer-section-title">Platform</h3>
              <div class="footer-links">
                <a href="https://test.angor.io" class="footer-link">Angor App</a>
                <a href="https://hub.angor.io" class="footer-link">Angor Hub</a>
                <a href="https://profile.angor.io" class="footer-link">Angor Profile</a>
                <a href="https://blog.angor.io" class="footer-link">Angor Blog</a>
                <a href="https://angor.io" class="footer-link">Angor Web</a>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-divider"></div>

        <div class="footer-bottom">
          <div class="footer-legal">
            <div class="copyright-section">
              <p class="copyright">
                &copy; {{ currentYear }} Angor Profile. All rights reserved.
              </p>
            </div>
            <div class="legal-section">
              <a href="https://angor.io/terms/" class="legal-link">Terms of Use</a>
              <a href="https://angor.io/privacy/" class="legal-link">Privacy Policy</a>
              <span class="version-info">v{{ version }}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .app-header {
      background: var(--background);
      border-bottom: 1px solid var(--accent-dark);
      backdrop-filter: blur(20px);
      position: sticky;
      top: 0;
      z-index: 1000;
      transition: all 0.3s ease;
    }

    .nav-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      height: 64px;
    }

    .nav-brand {
      display: flex;
      align-items: center;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .theme-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: 1px solid var(--secondary-border);
      border-radius: 12px;
      background: var(--surface-card);
      color: var(--header-text);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      opacity: 0.8;
    }

    .theme-toggle-btn:hover {
      background: var(--surface-hover);
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--accent-glow, rgba(0, 0, 0, 0.1));
    }

    .theme-toggle-btn:active {
      transform: translateY(0);
    }

    .theme-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .theme-toggle-btn:hover .theme-icon-wrapper {
      transform: rotate(180deg);
    }

    .theme-icon {
      width: 20px;
      height: 20px;
      transition: all 0.3s ease;
    }

    .theme-toggle-btn:hover .theme-icon {
      transform: scale(1.1);
    }

    .main-content {
      min-height: calc(100vh - 120px);
      flex: 1;
    }

    .app-footer {
      background: var(--background);
      border-top: 1px solid var(--accent-dark);
      margin-top: auto;
      position: relative;
    }

    .app-footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent-dark), transparent);
      opacity: 0.5;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 2rem 2rem;
    }

    .footer-main {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6rem;
      margin-bottom: 3rem;
      align-items: start;
    }

    .footer-brand {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 400px;
    }

    .footer-logo {
      width: 150px;
      height: auto;
      transition: all 0.3s ease;
    }

    .footer-logo:hover {
      opacity: 0.8;
      transform: scale(1.02);
    }

    .footer-description {
      color: var(--text-secondary);
      font-size: 1rem;
      line-height: 1.6;
      margin: 0;
      font-weight: 400;
    }

    .footer-sections {
      display: flex;
      justify-content: flex-end;
    }

    .footer-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .footer-section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.01em;
    }

    .footer-links {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .footer-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      line-height: 1.5;
      font-weight: 400;
    }

    .footer-link:hover {
      color: var(--accent);
      transform: translateX(2px);
    }

    .footer-divider {
      height: 1px;
      background: var(--accent-dark);
      margin: 2.5rem 0 2rem;
      opacity: 0.5;
    }

    .footer-bottom {
      padding: 0;
    }

    .footer-legal {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 2rem;
    }

    .copyright-section {
      flex: none;
      margin-right: auto;
    }

    .copyright {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin: 0;
      font-weight: 400;
      line-height: 1.5;
      opacity: 0.8;
    }

    .legal-section {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .legal-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      opacity: 0.8;
    }

    .legal-link:hover {
      color: var(--accent);
      opacity: 1;
    }

    .version-info {
      color: var(--text-secondary);
      font-size: 0.75rem;
      opacity: 0.6;
      font-family: 'SF Mono', monospace;
      background: var(--background);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--accent-dark);
    }

    @media (max-width: 1024px) {
      .footer-content {
        padding: 4rem 1.5rem 2rem;
      }

      .footer-main {
        gap: 4rem;
      }

      .footer-sections {
        gap: 2.5rem;
      }
    }

    @media (max-width: 968px) {
      .footer-main {
        grid-template-columns: 1fr;
        gap: 3rem;
      }

      .footer-brand {
        text-align: center;
        align-items: center;
        max-width: 500px;
        margin: 0 auto;
      }

      .footer-sections {
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
      }

      .footer-section {
        text-align: center;
      }

      .footer-section-title::after {
        left: 50%;
        transform: translateX(-50%);
      }
    }

    @media (max-width: 768px) {
      .nav-container {
        padding: 1rem;
      }

      .footer-content {
        padding: 3rem 1rem 2rem;
      }

      .footer-main {
        grid-template-columns: 1fr;
        gap: 3rem;
        margin-bottom: 3rem;
      }

      .footer-brand::before {
        display: none;
      }

      .footer-section {
        margin: 0 auto;
        max-width: 100%;
        min-width: auto;
        padding: 2rem 1.5rem;
      }

      .footer-sections {
        justify-content: center;
      }

      .footer-logo {
        width: 140px;
      }

      .footer-description {
        font-size: 1rem;
        text-align: left;
        padding-left: 0;
      }

      .footer-description::before {
        display: none;
      }

      .footer-legal {
        flex-direction: column;
        gap: 1.5rem;
        align-items: center;
        text-align: center;
      }

      .copyright-section {
        text-align: center;
        margin-right: 0;
      }

      .legal-section {
        justify-content: center;
        gap: 1.5rem;
      }
    }

    @media (max-width: 480px) {
      .nav-container {
        padding: 0.75rem;
      }

      .theme-toggle-btn {
        width: 40px;
        height: 40px;
      }

      .theme-icon {
        font-size: 18px;
      }

      .footer-content {
        padding: 2rem 1rem 1.5rem;
      }

      .footer-main {
        gap: 2rem;
        margin-bottom: 2rem;
      }

      .footer-brand {
        gap: 1.5rem;
      }

      .footer-description {
        font-size: 0.9rem;
        text-align: center;
      }

      .legal-section {
        flex-direction: column;
        gap: 1rem;
      }

      .version-info {
        padding: 0.2rem 0.5rem;
        font-size: 0.75rem;
      }
    }

    :root[data-theme="dark"] {
      --accent-glow: rgba(99, 102, 241, 0.3);
    }

    :root[data-theme="light"] {
      --accent-glow: rgba(0, 0, 0, 0.1);
    }
  `]
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
