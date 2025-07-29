import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-image-popup',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('overlay', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('dialog', [
      transition(':enter', [
        style({ transform: 'scale(0.95)', opacity: 0 }),
        animate('150ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ])
  ],
  template: `
    <div class="fixed inset-0 bg-black/90 flex justify-center items-center z-[1000] cursor-pointer backdrop-blur-sm" [@overlay] (click)="close.emit()">
      <img 
        [src]="imageUrl()" 
        [alt]="altText()" 
        class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg cursor-default" 
        [@dialog]
        (click)="$event.stopPropagation()"
      />
    </div>
  `
})
export class ImagePopupComponent {
  imageUrl = input<string>('');
  altText = input<string>('');
  close = output<void>();
}
