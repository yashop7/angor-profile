import { Component, input, output, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment';
import { ImagePopupComponent } from './image-popup.component';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, ImagePopupComponent],
  template: `
    <div class="relative w-full">
      <div 
        class="w-full bg-background border-2 border-dashed border-secondary-border rounded-xl cursor-pointer overflow-hidden transition-all duration-300 ease-out flex items-center justify-center mb-4 relative group hover:border-accent hover:-translate-y-0.5 hover:shadow-xl"
        [style.aspect-ratio]="aspectRatio()"
        [class]="getContainerClasses()"
        (click)="imageUrl() ? showPreview() : triggerFileInput()" 
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (imageUrl()) {
          <img [src]="imageUrl()" [alt]="label()" class="w-full h-full object-cover transition-all duration-300 ease-in-out group-hover:brightness-75 group-hover:scale-105">
        } @else {
          <div class="w-full h-full flex items-center justify-center bg-gradient-to-135 from-surface-card to-background">
            <div class="text-center p-8">
              <div class="w-20 h-20 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out group-hover:bg-accent/20 group-hover:scale-110">
                <i class="fas fa-image text-2xl text-accent"></i>
              </div>
              <p class="text-lg font-semibold text-text m-0 mb-2">Add {{ label() }}</p>
              <p class="text-sm text-text-secondary m-0 mb-1">
                {{ aspectRatio() === '16/9' ? 'Recommended size: 1200x675 pixels' : 'Recommended size: 400x400 pixels' }}
              </p>
              <p class="text-sm text-text-secondary m-0">Click to upload or paste URL below</p>
            </div>
          </div>
        }
        
        @if (imageUrl()) {
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100">
            <button class="bg-black/80 border-none text-white w-12 h-12 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 ease-out backdrop-blur-md text-base hover:scale-110 hover:bg-accent" (click)="triggerFileInput(); $event.stopPropagation()" title="Upload new image">
              <i class="fas fa-upload"></i>
            </button>
            <button class="bg-black/80 border-none text-white w-12 h-12 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 ease-out backdrop-blur-md text-base hover:scale-110 hover:bg-red-500" (click)="clearImage($event)" title="Remove image">
              <i class="fas fa-times"></i>
            </button>
          </div>
        }
      </div>

      <div class="w-full">
        <div class="relative flex items-center">
          <input
            type="url"
            [placeholder]="'Enter ' + label().toLowerCase() + ' URL'"
            [ngModel]="imageUrl()"
            (ngModelChange)="onUrlChange($event)"
            class="w-full px-4 py-3 pr-12 border border-secondary-border rounded-lg bg-surface-card text-text text-sm transition-all duration-300 ease-in-out placeholder:text-text-secondary placeholder:opacity-70 focus:outline-none focus:border-accent focus:shadow-md"
          >
          @if (imageUrl()) {
            <button class="absolute right-3 bg-none border-none text-text-secondary cursor-pointer p-2 rounded transition-all duration-200 ease-in-out flex items-center justify-center hover:text-accent hover:bg-accent/10" (click)="clearImage($event)">
              <i class="fas fa-times"></i>
            </button>
          }
        </div>
        <small class="block text-text-secondary text-xs mt-2 text-center">
          {{ aspectRatio() === '16/9' ? 'Drop a banner image, paste URL, or click to upload' : 'Drop a profile image, paste URL, or click to upload' }}
        </small>
      </div>

      <input
        #fileInput
        type="file"
        accept="image/*"
        (change)="onFileSelected($event)"
        class="hidden"
      >

      @if (uploading()) {
        <div class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 text-white rounded-xl backdrop-blur-lg z-10">
          <div class="w-10 h-10 border-2 border-white/30 border-t-accent rounded-full animate-spin"></div>
          <span class="font-medium text-sm">Uploading...</span>
        </div>
      }
    </div>

    @if (showPopup()) {
      <app-image-popup
        [imageUrl]="imageUrl()"
        [altText]="label()"
        (close)="showPopup.set(false)"
      ></app-image-popup>
    }
  `
})
export class ImageUploadComponent {
  label = input<string>('Image');
  imageUrl = input<string>('');
  aspectRatio = input<string>('1');
  urlChanged = output<string>();

  uploading = signal(false);
  showPopup = signal(false);
  isDragging = signal(false);
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(private http: HttpClient) {}

  getContainerClasses(): string {
    const baseClasses = '';
    const hasImageClasses = this.imageUrl() ? 'border-solid border-secondary-border hover:border-accent' : '';
    const dragOverClasses = this.isDragging() ? 'border-accent bg-accent/5 scale-105' : '';
    const aspectRatioClasses = this.aspectRatio() === '16/9' ? 'max-h-[300px]' : 'max-h-[350px]';
    
    return `${baseClasses} ${hasImageClasses} ${dragOverClasses} ${aspectRatioClasses}`.trim();
  }

  triggerFileInput() {
    this.fileInput()?.nativeElement?.click();
  }

  showPreview() {
    if (this.imageUrl()) {
      this.showPopup.set(true);
    }
  }

  clearImage(event: Event) {
    event.stopPropagation();
    this.urlChanged.emit('');
  }

  onUrlChange(url: string) {
    // Basic URL validation
    if (url && !url.match(/^https?:\/\/.+/)) {
      url = 'https://' + url;
    }
    this.urlChanged.emit(url);
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > this.maxFileSize) {
      alert('File size should be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed');
      return;
    }

    if (!environment.imgbbApiKey || environment.imgbbApiKey === 'YOUR_IMGBB_API_KEY') {
      alert('Image upload service is not configured. Please use the URL input field instead.');
      return;
    }

    this.uploading.set(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload to ImgBB
      const response = await fetch('https://api.imgbb.com/1/upload?key=' + environment.imgbbApiKey, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        this.urlChanged.emit(data.data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again or use an image URL instead.');
    } finally {
      this.uploading.set(false);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      this.onFileSelected(fakeEvent);
    }
  }
}