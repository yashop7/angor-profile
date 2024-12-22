import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaItem } from '../services/relay.service';

@Component({
  selector: 'app-signing-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible">
      <div class="dialog-content">
        <h2>Sign Profile Updates</h2>
        
        <div class="data-preview">
          <div class="preview-tabs">
            <button 
              *ngFor="let tab of dataTabs" 
              [class.active]="activeTab === tab.id"
              (click)="activeTab = tab.id"
              class="tab-button"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="preview-content">
            <ng-container [ngSwitch]="activeTab">
              <div *ngSwitchCase="'profile'">
                <h3>Profile Metadata:</h3>
                <pre>{{ dataToSign?.profile | json }}</pre>
              </div>
              
              <div *ngSwitchCase="'project'">
                <h3>Project Content:</h3>
                <pre>{{ dataToSign?.project | json }}</pre>
              </div>
              
              <div *ngSwitchCase="'faq'">
                <h3>FAQ Items:</h3>
                <pre>{{ dataToSign?.faq | json }}</pre>
              </div>
              
              <div *ngSwitchCase="'members'">
                <h3>Team Members:</h3>
                <pre>{{ dataToSign?.members | json }}</pre>
              </div>

              <div *ngSwitchCase="'media'">
                <h3>Media Items:</h3>
                <div class="media-list">
                  <div *ngFor="let item of dataToSign?.media" class="media-item">
                    <div class="media-preview">
                      <img *ngIf="item.type === 'image'" [src]="item.url" alt="Preview">
                      <video *ngIf="item.type === 'video'" [src]="item.url" controls></video>
                    </div>
                  </div>
                </div>
              </div>

            </ng-container>
          </div>
        </div>

        <div class="signing-methods">
          <div class="method-section">
            <h3>Sign with Extension</h3>
            <button class="primary-button" (click)="signWithExtension()" [disabled]="!hasNostrExtension">
              {{ hasNostrExtension ? 'Sign with Browser Extension' : 'No Nostr Extension Found' }}
            </button>
          </div>

          <div class="divider">OR</div>

          <div class="method-section">
            <h3>Sign with Private Key</h3>
            <input 
              type="password" 
              [(ngModel)]="privateKey" 
              placeholder="Enter your Nostr private key"
              class="key-input"
            >
            <button class="primary-button" (click)="signWithKey()" [disabled]="!privateKey">
              Sign with Key
            </button>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="secondary-button" (click)="onCancel()">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog-content {
      background: var(--surface-card);
      border-radius: 8px;
      padding: 2rem;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .data-preview {
      margin: 1rem 0;
      padding: 1rem;
      background: var(--surface-ground);
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .data-preview pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 0.9rem;
      color: var(--text);
    }

    .signing-methods {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 1.5rem 0;
    }

    .method-section {
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 4px;
    }

    .divider {
      text-align: center;
      font-weight: 500;
      color: var(--text-secondary);
      margin: 1rem 0;
    }

    .key-input {
      width: 100%;
      margin-bottom: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--surface-ground);
      color: var(--text);
      font-size: 1rem;
      transition: all 0.2s ease;
    }

    .key-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(8, 108, 129, 0.1);
    }

    .primary-button, .secondary-button {
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    }

    .primary-button {
      background: var(--accent);
      color: white;
      border: none;
    }

    .secondary-button {
      background: var(--surface-ground);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .primary-button:hover:not(:disabled),
    .secondary-button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .primary-button:hover:not(:disabled) {
      background: var(--accent-dark);
    }

    .secondary-button:hover:not(:disabled) {
      background: var(--surface-hover);
    }

    .method-section h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: var(--text);
      font-size: 1.1rem;
      font-weight: 500;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .preview-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.5rem 1rem;
      border: none;
      background: none;
      color: var(--text);
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.2s ease;
      position: relative;
    }

    .tab-button:hover {
      opacity: 1;
      background: var(--surface-hover);
    }

    .tab-button.active {
      opacity: 1;
      color: var(--accent);
    }

    .tab-button.active::after {
      content: '';
      position: absolute;
      bottom: -0.5rem;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }

    .preview-content {
      padding: 1rem;
      background: var(--surface-ground);
      border-radius: 4px;
      min-height: 200px;
      max-height: 300px;
      overflow-y: auto;
    }

    .preview-content h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: var(--text);
      font-size: 1rem;
    }

    .preview-content pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 0.9rem;
      color: var(--text);
    }

    .media-editor {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .media-input {
      display: flex;
      gap: 0.5rem;
    }

    .media-type-select {
      min-width: 100px;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--surface-ground);
      color: var(--text);
    }

    .media-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .media-item {
      display: flex;
      gap: 1rem;
      padding: 0.5rem;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 4px;
    }

    .media-preview {
      flex: 1;
      max-width: 200px;
      overflow: hidden;
    }

    .media-preview img,
    .media-preview video {
      width: 100%;
      height: auto;
      object-fit: cover;
    }

    .media-controls {
      display: flex;
      gap: 0.5rem;
    }

    .move-button,
    .delete-button {
      padding: 0.25rem 0.5rem;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--text-secondary);
    }

    .delete-button:hover {
      color: var(--danger);
    }
  `]
})
export class SigningDialogComponent {
  @Input() visible = false;
  @Input() dataToSign: any = null;
  @Output() sign = new EventEmitter<{ signed: boolean; key?: string }>();
  
  privateKey = '';
  hasNostrExtension = false;
  activeTab = 'profile';

  dataTabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'project', label: 'Project' },
    { id: 'faq', label: 'FAQ' },
    { id: 'members', label: 'Members' },
    { id: 'media', label: 'Media' }
  ];

  newMediaUrl = '';
  newMediaType: 'image' | 'video' = 'image';

  constructor() {
    // Check for Nostr extension
    this.hasNostrExtension = window.hasOwnProperty('nostr');
    this.hasNostrExtension = true;
  }

  signWithExtension() {
    this.sign.emit({ signed: true, key: 'extension' });
  }

  signWithKey() {
    if (this.privateKey) {
      this.sign.emit({ signed: true, key: this.privateKey });
    }
  }

  onCancel() {
    this.sign.emit({ signed: false });
  }
}
