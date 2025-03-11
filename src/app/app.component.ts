import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';
import { environment } from '../environment';
import { AppLauncherComponent } from './components/app-launcher.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AppLauncherComponent],
  template: `
    <header>
      <nav>
      <app-launcher></app-launcher>
        <!-- <a routerLink="/" class="logo-link">
          <img src="images/logo-text.svg" alt="Angor Profile Logo" class="logo">
        </a> -->
        <div class="nav-links">
          <!-- <a href="https://hub.angor.io/explore">Explore</a>
          <a routerLink="/profile">Profile</a> -->
          <button (click)="toggleTheme()" class="theme-toggle">
            {{ (themeService.theme$ | async) === 'light' ? '☀️' : '🌙' }}
          </button>
        </div>
      </nav>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="modern-footer">
      <div class="footer-bottom">
        <div>
          <img src="images/logo.svg" alt="Angor Logo" class="footer-logo">
          <p class="footer-slogan">Angor is a P2P funding protocol built on Bitcoin and Nostr</p>
        </div>

        <p>&copy; 2024 Angor Profile. All rights reserved. Version {{ version }}.
           <a href="https://angor.io/terms/">Terms of Use</a>.
        <a href="https://angor.io/privacy/">Privacy Policy</a>.</p>
      </div>
    </footer>
  `,
  styles: [`
    .theme-toggle {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.5rem;
    }

    .modern-footer {
      background: var(--header-bg);
      color: var(--header-text);
      padding: 3rem 1rem 3rem;
      margin-top: 4rem;
    }

    .footer-bottom {
      padding-top: 1rem;
      text-align: center;
      opacity: 0.8;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .footer-content {
        grid-template-columns: 1fr;
        text-align: center;
      }

      .social-links {
        justify-content: center;
      }
    }

    .brand-section {
      grid-column: auto;
      text-align: left;
      margin: 1em;
    }

    @media (max-width: 1024px) {
      .footer-content {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .brand-section {
        text-align: center;
      }
    }

    .footer-logo {
      height: 40px;
      width: auto;
      margin-bottom: 1rem;
    }

    .footer-slogan {
      opacity: 0.8;
      max-width: 400px;
      margin: 0 auto;
      line-height: 1.5;
    }
  `]
})
export class AppComponent {
  title = 'angor-profile';

  version = environment.appVersion

  constructor(public themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
