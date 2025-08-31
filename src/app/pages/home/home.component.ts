import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { nip19 } from 'nostr-tools';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="h-screen flex flex-col bg-background">
      <div class="flex-1 flex flex-col justify-center items-center text-center gap-12 bg-surface-card px-6 md:px-4">
        <div class="max-w-2xl">
          <h1 class="text-4xl md:text-6xl font-bold leading-tight mb-6 text-text tracking-tight">
            Welcome to Angor
            <br> Profile
          </h1>
          <p class="text-lg md:text-xl leading-relaxed text-text-secondary opacity-90 m-0">
            A clean, modern Nostr profile editor designed specifically for managing 
            your Angor project information with ease and elegance.
          </p>
        </div>
        
        <div class="w-full max-w-2xl">
          <div class="flex flex-col md:flex-row gap-4 md:gap-4 mb-4 bg-surface-card border-2 border-secondary-border rounded-2xl p-2 md:p-2 transition-all duration-300">
            <input 
              [(ngModel)]="profileId" 
              placeholder="Npub or HEX Pubkey" 
              (keyup.enter)="openProfile()"
              class="flex-1 px-4 py-4 md:px-5 md:py-4 rounded-xl bg-background text-text text-base outline-none border-0 placeholder:text-text-secondary placeholder:opacity-70"
              [class]="profileId() && !isValidKey() ? 'text-red-500' : ''"
            >
            <button 
              (click)="openProfile()" 
              class="flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-4 border-0 rounded-xl bg-accent text-white text-base font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:bg-accent-dark hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:bg-text-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none w-full md:w-auto"
              [disabled]="!isValidInput()"
            >
              <i class="fas fa-arrow-right"></i>
              <span>Open Profile</span>
            </button>
          </div>
          
          @if (profileId() && !isValidKey()) {
            <div class="flex items-center justify-center gap-2 text-red-500 text-sm mt-3 font-medium">
              <i class="fas fa-exclamation-circle"></i>
              Please enter a valid npub or hex key
            </div>
          }
        </div>
      </div>
    </section>
  `
})
export class HomeComponent implements OnInit {
  profileId = signal('');
  private readonly STORAGE_KEY = 'angor-profile-id';

  isValidKey = computed(() => {
    return this.isValidInput();
  });

  constructor(private router: Router) {}

  ngOnInit() {
    const savedProfileId = localStorage.getItem(this.STORAGE_KEY);
    if (savedProfileId) {
      this.profileId.set(savedProfileId);
    }
  }

  openProfile() {
    if (this.profileId() && this.isValidInput()) {
      localStorage.setItem(this.STORAGE_KEY, this.profileId());
      this.router.navigate(['/profile', this.profileId()]);
    }
  }

  isValidInput(): boolean {
    if (!this.profileId()) return false;
    const input = this.profileId().toLowerCase();
    if (input.startsWith('npub')) {
      try {
        nip19.decode(this.profileId());
        return true;
      } catch {
        return false;
      }
    }
    return /^[0-9a-f]{64}$/i.test(this.profileId());
  }
}
