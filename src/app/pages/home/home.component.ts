import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="landing-hero">

      <div class="landing-content">
        <div class="landing-header">
          <h1 class="landing-title">Welcome to Angor Profile</h1>
          <p class="landing-description">
            A clean, modern Nostr profile editor designed specifically for managing 
            your Angor project information with ease and elegance.
          </p>
        </div>
        
        <div class="landing-action">
          <div class="input-group">
            <input 
              [ngModel]="profileId()"
              (ngModelChange)="profileId.set($event)"
              placeholder="Enter your npub..." 
              (keyup.enter)="openProfile()"
              class="landing-input border border-blue-600"
              [class.error]="profileId() && !isValidNpub()"
            >
            <button 
              (click)="openProfile()" 
              class="landing-button"
            >
              <i class="fas fa-arrow-right"></i>
              <span>Open Profile</span>
            </button>
          </div>
          
          @if (profileId() && !isValidNpub()) {
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              Please enter a valid npub key
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .landing-hero {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--background);
      padding: 0 2rem;
    }

    .landing-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
      gap: 3rem;
      background: var(--surface-card);
      padding: 0 2.5rem;
    }

   
    .landing-header {
      max-width: 600px;
    }

    .landing-title {
      font-size: 4rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 1.5rem;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    .landing-description {
      font-size: 1.3rem;
      line-height: 1.6;
      color: var(--text-secondary);
      margin: 0;
      opacity: 0.9;
    }

    .landing-action {
      width: 100%;
      max-width: 600px;
    }

    .input-group {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      background: var(--surface-card);
      border: 2px solid var(--secondary-border);
      border-radius: 16px;
      padding: 0.5rem;
      transition: all 0.3s ease;
    }

    .landing-input {
      flex: 1;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: var(--background);
      color: var(--text);
      font-size: 1rem;
      outline: none;
    }

    .landing-input::placeholder {
      color: var(--text-secondary);
      opacity: 0.7;
    }

    .landing-input.error {
      color: #ef4444;
    }

    .landing-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      background: var(--accent);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .landing-button:hover:not(:disabled) {
      background: var(--accent-dark);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(8, 108, 129, 0.3);
    }

    .landing-button:active:not(:disabled) {
      transform: translateY(0);
    }

    .landing-button:disabled {
      background: var(--text-secondary);
      cursor: not-allowed;
      opacity: 0.5;
      transform: none;
      box-shadow: none;
    }

    .error-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.75rem;
      font-weight: 500;
    }
    @media (max-width: 768px) {
      .landing-hero {
        padding: 0 1.5rem;
        min-height: calc(100vh - 120px);
      }

      .landing-content {
        gap: 2.5rem;
        padding: 0 1.5rem;
      }

      .landing-title {
        font-size: 2.5rem;
      }

      .landing-description {
        font-size: 1.1rem;
      }

      .input-group {
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
      }

      .landing-button {
        width: 100%;
        padding: 1rem 2rem;
      }
    }

    @media (min-width: 1200px) {
      .landing-content {
        gap: 2rem;
        padding: 0 1rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  profileId = signal('');
  private readonly STORAGE_KEY = 'angor-profile-id';

  isValidNpub = computed(() => {
    const id = this.profileId();
    return id.length > 0 && id.toLowerCase().startsWith('npub');
  });

  constructor(private router: Router) {}

  ngOnInit() {
    const savedProfileId = localStorage.getItem(this.STORAGE_KEY);
    if (savedProfileId) {
      this.profileId.set(savedProfileId);
    }
  }

  openProfile() {
    const id = this.profileId();
    if (id && this.isValidNpub()) {
      localStorage.setItem(this.STORAGE_KEY, id);
      this.router.navigate(['/profile', id]);
    }
  }
}
