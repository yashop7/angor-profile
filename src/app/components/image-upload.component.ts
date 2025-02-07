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
        (click)="imageUrl ? showPreview() : triggerFileInput()" 
        [class.has-image]="imageUrl"
      >
        <img *ngIf="imageUrl" [src]="imageUrl" [alt]="label" class="preview-image">
        <div *ngIf="!imageUrl" class="upload-placeholder">
          <!-- <i class="fas fa-image"></i> -->
          <!-- <span>Click to {{ imageUrl ? 'view' : 'upload' }} {{label.toLowerCase()}}</span> -->
        </div>
        
        <div *ngIf="imageUrl" class="image-actions">
<!-- Enable when we have upload service. -->
          <!-- <button class="action-button" (click)="triggerFileInput(); $event.stopPropagation()">
            <i class="fas fa-upload"></i>
          </button> -->
          <button class="action-button" (click)="clearImage($event)">
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
          >
          <button *ngIf="imageUrl" class="clear-button" (click)="clearImage($event)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <small class="helper-text">Drop an image file, paste a URL, or click to upload</small>
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
        <span>Uploading...</span>
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
      aspect-ratio: 16/9;
      background: var(--surface-ground);
      border: 2px dashed var(--border);
      border-radius: 8px;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
      position: relative;
    }

    .preview-container:hover {
      border-color: var(--accent);
      background: var(--surface-hover);
    }

    .preview-container.has-image {
      border-style: solid;
    }

    .preview-container.has-image:hover .image-actions {
      opacity: 1;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: filter 0.2s ease;
    }

    .preview-container:hover .preview-image {
      filter: brightness(0.7);
    }

    .image-actions {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      gap: 1rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .action-button {
      background: rgba(0, 0, 0, 0.6);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .action-button:hover {
      background: var(--accent);
      transform: scale(1.1);
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      padding: 2rem;
      text-align: center;
    }

    .upload-placeholder i {
      font-size: 2rem;
    }

    .url-input {
      width: 100%;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .url-input input {
      width: 100%;
      padding: 0.75rem;
      padding-right: 2.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--surface-ground);
      color: var(--text);
      font-size: 1rem;
    }

    .url-input input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .clear-button {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.5rem;
    }

    .clear-button:hover {
      color: var(--accent);
    }

    .helper-text {
      display: block;
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .upload-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: white;
      border-radius: 8px;
      backdrop-filter: blur(4px);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ImageUploadComponent {
  @Input() label: string = 'Image';
  @Input() imageUrl: string = '';
  @Output() urlChanged = new EventEmitter<string>();

  uploading = false;
  showPopup = false;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(private http: HttpClient) {}

  triggerFileInput() {
    // const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // fileInput?.click();
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
}