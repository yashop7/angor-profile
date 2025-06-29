import { Component, Input, Output, EventEmitter } from '@angular/core';
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
    <div class="image-upload">
      <div 
        class="preview-container" 
        [style.aspect-ratio]="aspectRatio"
        (click)="imageUrl ? showPreview() : triggerFileInput()" 
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        [class.has-image]="imageUrl"
        [class.drag-over]="isDragging"
      >
        <img *ngIf="imageUrl" [src]="imageUrl" [alt]="label" class="preview-image">
        <div *ngIf="!imageUrl" class="upload-placeholder">
          <div class="placeholder-content">
            <div class="placeholder-icon">
              <i class="fas fa-image"></i>
            </div>
            <p class="placeholder-title">Add {{ label }}</p>
            <p class="placeholder-subtitle">
              {{ aspectRatio === '16/9' ? 'Recommended size: 1200x675 pixels' : 'Recommended size: 400x400 pixels' }}
            </p>
            <p class="placeholder-subtitle">Click to upload or paste URL below</p>
          </div>
        </div>
        
        <div *ngIf="imageUrl" class="image-actions">
          <button class="action-button upload-btn" (click)="triggerFileInput(); $event.stopPropagation()" title="Upload new image">
            <i class="fas fa-upload"></i>
          </button>
          <button class="action-button remove-btn" (click)="clearImage($event)" title="Remove image">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="url-input">
        <div class="input-wrapper">
          <input
            type="url"
            [placeholder]="'Enter ' + label.toLowerCase() + ' URL'"
            [(ngModel)]="imageUrl"
            (ngModelChange)="onUrlChange($event)"
            class="url-field"
          >
          <button *ngIf="imageUrl" class="clear-button" (click)="clearImage($event)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <small class="helper-text"> {{ aspectRatio === '16/9' ? 'Drop a banner image, paste URL, or click to upload' : 'Drop a profile image, paste URL, or click to upload' }} </small>
      </div>

      <input
        #fileInput
        type="file"
        accept="image/*"
        (change)="onFileSelected($event)"
        style="display: none"
      >

      <div *ngIf="uploading" class="upload-overlay">
        <div class="spinner"></div>
        <span class="upload-text">Uploading...</span>
      </div>
    </div>

    <app-image-popup
      *ngIf="showPopup"
      [imageUrl]="imageUrl"
      [altText]="label"
      (close)="showPopup = false"
    ></app-image-popup>
  `,
  styles: [`
    .image-upload {
      position: relative;
      width: 100%;
    }

    .preview-container {
      width: 100%;
      background: var(--background);
      border: 2px dashed var(--secondary-border);
      border-radius: 12px;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      position: relative;
      max-height: 250px;
    }

    .preview-container:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px var(--accent)/15;
    }

    .preview-container.has-image {
      border-style: solid;
      border-color: var(--secondary-border);
    }

    .preview-container.has-image:hover {
      border-color: var(--accent);
    }

    .preview-container.drag-over {
      border-color: var(--accent);
      background: var(--accent)/5;
      transform: scale(1.02);
    }

    .preview-container.has-image:hover .image-actions {
      opacity: 1;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.3s ease;
    }

    .preview-container:hover .preview-image {
      filter: brightness(0.7);
      transform: scale(1.05);
    }

    .upload-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--surface-card), var(--background));
    }

    .placeholder-content {
      text-align: center;
      padding: 2rem;
    }

    .placeholder-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1rem;
      background: var(--accent)/10;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .placeholder-icon i {
      font-size: 2rem;
      color: var(--accent);
    }

    .preview-container:hover .placeholder-icon {
      background: var(--accent)/20;
      transform: scale(1.1);
    }

    .placeholder-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.5rem 0;
    }

    .placeholder-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .image-actions {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      gap: 1rem;
      opacity: 0;
      transition: all 0.3s ease;
    }

    .action-button {
      background: rgba(0, 0, 0, 0.8);
      border: none;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      font-size: 1rem;
    }

    .action-button:hover {
      transform: scale(1.1);
    }

    .upload-btn:hover {
      background: var(--accent);
    }

    .remove-btn:hover {
      background: #ef4444;
    }

    .url-input {
      width: 100%;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .url-field {
      width: 100%;
      padding: 0.75rem 1rem;
      padding-right: 3rem;
      border: 1px solid var(--secondary-border);
      border-radius: 8px;
      background: var(--surface-card);
      color: var(--text);
      font-size: 0.875rem;
      transition: all 0.3s ease;
    }

    .url-field::placeholder {
      color: var(--text-secondary);
      opacity: 0.7;
    }

    .url-field:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent)/20;
    }

    .clear-button {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clear-button:hover {
      color: var(--accent);
      background: var(--accent)/10;
    }

    .helper-text {
      display: block;
      color: var(--text-secondary);
      font-size: 0.75rem;
      margin-top: 0.5rem;
      text-align: center;
    }

    .upload-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: white;
      border-radius: 12px;
      backdrop-filter: blur(8px);
      z-index: 10;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .upload-text {
      font-weight: 500;
      font-size: 0.875rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .image-upload:has(.preview-container[style*="aspect-ratio: 16/9"]) .preview-container {
      aspect-ratio: 16/9;
      max-height: 200px;
    }

    .image-upload:has(.preview-container[style*="aspect-ratio: 1"]) .preview-container {
      aspect-ratio: 1;
      max-height: 400px;
    }
  `]
})
export class ImageUploadComponent {
  @Input() label: string = 'Image';
  @Input() imageUrl: string = '';
  @Input() aspectRatio: string = '1';
  @Output() urlChanged = new EventEmitter<string>();

  uploading = false;
  showPopup = false;
  isDragging = false;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(private http: HttpClient) {}

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  showPreview() {
    if (this.imageUrl) {
      this.showPopup = true;
    }
  }

  clearImage(event: Event) {
    event.stopPropagation();
    this.imageUrl = '';
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

    this.uploading = true;
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
        this.imageUrl = data.data.url;
        this.urlChanged.emit(this.imageUrl);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again or use an image URL instead.');
    } finally {
      this.uploading = false;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

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