import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface BreadcrumbItem {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div aria-label="breadcrumb">
      <ol class="flex items-center px-4 py-3 max-w-7xl sm:ml-4 md:ml-12">
        @for (item of items(); track $index; let last = $last) {
          <li class="flex items-center">
            @if (!$first) {
              <span class="mx-2">/</span>
            }
            @if (!last) {
              <a [routerLink]="item.url">
                {{ item.label }}
              </a>
            } @else {
              <span class="text-gray-600 ml-2">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </div>
  `
})
export class BreadcrumbComponent {
  items = input<BreadcrumbItem[]>([]);
}
