import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { nip19 } from 'nostr-tools';
import { getPublicKey } from 'nostr-tools';

@Component({
  selector: 'app-signing-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible">
      <div class="dialog">
        <h2>{{ title || 'Sign Data' }}</h2>
        
        <div class="dialog-content">
          <p>{{ getSigningMessage() }}</p>
          
          @if (validationError) {
            <div class="error-message">
              {{ validationError }}
            </div>
          }
          
          <div *ngIf="showDataPreview" class="data-preview">
            <pre>{{ getDataPreviewText() }}</pre>
          </div>

          <div class="signing-options">
            <button class="sign-button extension" (click)="signWithExtension()">
              Sign with Extension
            </button>
            <div class="or-divider">OR</div>
            <div class="private-key-section">
              <input
                type="password"
                [(ngModel)]="privateKey"
                placeholder="Enter your private key (nsec)"
                class="private-key-input"
              />
              <button
                class="sign-button private-key"
                [disabled]="!privateKey"
                (click)="signWithPrivateKey()"
              >
                Sign with Private Key
              </button>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="cancel-button" (click)="cancel()">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .dialog {
        background: var(--surface-card);
        border-radius: 8px;
        padding: 2rem;
        width: 90%;
        max-width: 600px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }

      h2 {
        margin-top: 0;
        color: var(--text);
        margin-bottom: 1.5rem;
      }

      .dialog-content {
        margin-bottom: 2rem;
      }

      .error-message {
        background: #fee;
        color: #c33;
        padding: 1rem;
        border-radius: 4px;
        border-left: 4px solid #c33;
        margin: 1rem 0;
        font-size: 0.9rem;
      }

      .data-preview {
        background: var(--surface-ground);
        padding: 1rem;
        border-radius: 4px;
        margin: 1rem 0;
        max-height: 200px;
        overflow-y: auto;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-all;
        color: var(--text);
      }

      .signing-options {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-top: 2rem;
      }

      .sign-button {
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      }

      .sign-button.extension {
        background: var(--accent);
        color: white;
        border: none;
      }

      .sign-button.extension:hover {
        background: var(--accent-dark);
      }

      .or-divider {
        text-align: center;
        color: var(--text-secondary);
        font-size: 0.9rem;
        position: relative;
      }

      .or-divider::before,
      .or-divider::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 45%;
        height: 1px;
        background: var(--border);
      }

      .or-divider::before {
        left: 0;
      }

      .or-divider::after {
        right: 0;
      }

      .private-key-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .private-key-input {
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface-ground);
        color: var(--text);
      }

      .sign-button.private-key {
        background: var(--surface-ground);
        border: 1px solid var(--border);
        color: var(--text);
      }

      .sign-button.private-key:hover:not(:disabled) {
        background: var(--surface-hover);
      }

      .sign-button.private-key:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
      }

      .cancel-button {
        padding: 0.75rem 1.5rem;
        background: none;
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--text);
        cursor: pointer;
        transition: all 0.2s;
      }

      .cancel-button:hover {
        background: var(--surface-hover);
      }
    `,
  ],
})
export class SigningDialogComponent {
  @Input() visible = false;
  @Input() dataToSign: any = null;
  @Input() title: string = ''; // Custom title for the dialog
  @Input() signingPurpose: 'profile' | 'badge' = 'profile'; // Purpose of signing
  @Input() showDataPreview: boolean = true; // Whether to show a preview of the data
  @Input() expectedPubkey: string = ''; // The expected public key that should be used for signing

  @Output() sign = new EventEmitter<{ signed: boolean; key?: string }>();

  privateKey = '';
  validationError = '';

  getSigningMessage(): string {
    if (this.signingPurpose === 'badge') {
      return 'Sign this badge definition and award to issue it to the member.';
    }
    return 'Please sign this data to save your profile changes.';
  }

  getDataPreviewText(): string {
    if (!this.dataToSign) return '';
    
    if (this.signingPurpose === 'badge') {
      return `Issuing badge to: ${this.dataToSign.recipient || 'member'}\n` +
             `Badge type: ${this.dataToSign.badgeName || 'Angor Member'}`;
    }
    
    // For profile data, show a summary
    const summary: string[] = [];
    if (this.dataToSign.profile) summary.push('✓ Profile Information');
    if (this.dataToSign.project) summary.push('✓ Project Content');
    if (this.dataToSign.faq) summary.push(`✓ FAQ Items (${this.dataToSign.faq.length})`);
    if (this.dataToSign.members) summary.push(`✓ Members (${this.dataToSign.members.pubkeys?.length || 0})`);
    if (this.dataToSign.media) summary.push(`✓ Media Items (${this.dataToSign.media.length})`);
    
    return summary.join('\n');
  }

  async signWithExtension() {
    this.validationError = '';
    
    try {
      // Check if extension is available
      if (!window.nostr) {
        this.validationError = 'Nostr extension not found. Please install a Nostr extension.';
        return;
      }

      // Get public key from extension
      const extensionPubkey = await window.nostr.getPublicKey();
      
      // Validate that the extension's pubkey matches the expected pubkey
      if (extensionPubkey !== this.expectedPubkey) {
        this.validationError = 'The account signed in to the extension does not match the profile being edited. Please switch to the correct account in your extension or use the correct private key.';
        return;
      }

      this.sign.emit({ signed: true, key: 'extension' });
    } catch (error) {
      console.error('Error getting public key from extension:', error);
      this.validationError = 'Failed to get public key from extension. Please try again.';
    }
  }

  async signWithPrivateKey() {
    this.validationError = '';
    
    if (!this.privateKey) return;
    
    try {
      let privateKeyHex = this.privateKey;
      
      // Convert nsec to hex if needed
      if (this.privateKey.startsWith('nsec')) {
        const decoded = nip19.decode(this.privateKey);
        privateKeyHex = decoded.data as string;
      }
      
      // Get public key from private key
      const privateKeyBytes = new Uint8Array(privateKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const derivedPubkey = getPublicKey(privateKeyBytes);
      
      // Validate that the derived pubkey matches the expected pubkey
      if (derivedPubkey !== this.expectedPubkey) {
        this.validationError = 'The private key provided does not match the profile being edited. Please use the correct private key for this account.';
        return;
      }

      this.sign.emit({ signed: true, key: privateKeyHex });
      this.privateKey = '';
    } catch (error) {
      console.error('Error validating private key:', error);
      this.validationError = 'Invalid private key format. Please enter a valid nsec key or hex private key.';
    }
  }

  cancel() {
    this.sign.emit({ signed: false });
    this.privateKey = '';
    this.validationError = '';
  }
}
