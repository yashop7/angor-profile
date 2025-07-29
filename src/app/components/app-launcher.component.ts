import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-launcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative cursor-pointer">
      <a class="block" (click)="toggleAppMenu($event)">
        <img src="images/logo-text.svg" alt="Angor Menu" class="h-8 w-auto transition-all duration-300 ease-out cursor-pointer">
      </a>
    </div>
  `
})
export class AppLauncherComponent {
  isAppMenuOpen = signal(false);

  toggleAppMenu(event: Event) {
    event.preventDefault();
    this.isAppMenuOpen.update(isOpen => !isOpen);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const appLauncher = (event.target as HTMLElement).closest('.app-launcher');
    if (!appLauncher) {
      this.isAppMenuOpen.set(false);
    }
  }
}
