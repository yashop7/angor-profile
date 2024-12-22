import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signing-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible">
      <div class="dialog-content">
        <h2>Sign Profile Updates</h2>
        
        <div class="data-preview">
          <h3>Data to be signed:</h3>
          <pre>{{ dataToSign | json }}</pre>
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
  `]
})
export class SigningDialogComponent {
  @Input() visible = false;
  @Input() dataToSign: any = null;
  @Output() sign = new EventEmitter<{ signed: boolean; key?: string }>();
  
  privateKey = '';
  hasNostrExtension = false;

  constructor() {
    // Check for Nostr extension
    // TODO: This check does not work!!
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
