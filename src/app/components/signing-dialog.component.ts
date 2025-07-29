import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { nip19, getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

@Component({
  selector: 'app-signing-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible) {
      <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] backdrop-blur-sm">
        <div class="bg-surface-card rounded-xl p-8 w-[90%] max-w-2xl shadow-2xl border border-secondary-border">
          <h2 class="text-2xl font-bold text-text mb-6">{{ title || 'Sign Data' }}</h2>
          
          <div class="mb-8">
            <p class="text-text-secondary mb-4">{{ getSigningMessage() }}</p>
            
            @if (validationError()) {
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg border-l-4 border-l-red-500 mb-4">
                {{ validationError() }}
              </div>
            }
            
            @if (showDataPreview) {
              <div class="bg-background border border-secondary-border rounded-lg p-4 max-h-48 overflow-y-auto mb-6">
                <pre class="text-text text-sm whitespace-pre-wrap break-words">{{ getDataPreviewText() }}</pre>
              </div>
            }

            <div class="space-y-6">
              <button 
                class="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                (click)="signWithExtension()"
              >
                Sign with Extension
              </button>
              
              <div class="relative text-center">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-secondary-border"></div>
                </div>
                <div class="relative bg-surface-card px-4">
                  <span class="text-text-secondary text-sm">OR</span>
                </div>
              </div>
              
              <div class="space-y-4">
                <input
                  type="password"
                  [ngModel]="privateKey()"
                  (ngModelChange)="privateKey.set($event)"
                  placeholder="Enter your private key (nsec)"
                  class="w-full px-4 py-3 border border-secondary-border rounded-lg bg-background text-text focus:outline-none focus:border-accent transition-colors duration-200"
                />
                <button
                  class="w-full bg-background hover:bg-secondary-card text-text font-semibold py-3 px-6 rounded-lg border border-secondary-border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  [disabled]="!privateKey()"
                  (click)="signWithPrivateKey()"
                >
                  Sign with Private Key
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button 
              class="px-6 py-3 border border-border rounded-lg text-text-secondary transition-colors duration-200"
              (click)="cancel()"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SigningDialogComponent {
  @Input() visible = false;
  @Input() dataToSign: any = null;
  @Input() title: string = ''; // Custom title for the dialog
  @Input() signingPurpose: 'profile' | 'badge' = 'profile'; // Purpose of signing
  @Input() showDataPreview: boolean = true; // Whether to show a preview of the data
  @Input() expectedPubkey: string = ''; // The expected public key that should be used for signing

  @Output() sign = new EventEmitter<{ signed: boolean; key?: string }>();

  privateKey = signal('');
  validationError = signal('');

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
    this.validationError.set('');

    try {
      // Check if extension is available
      if (!window.nostr) {
        this.validationError.set('Nostr extension not found. Please install a Nostr extension.');
        return;
      }

      // Get public key from extension
      const extensionPubkey = await window.nostr.getPublicKey();

      // Validate that the extension's pubkey matches the expected pubkey
      if (extensionPubkey !== this.expectedPubkey) {
        this.validationError.set('The account signed in to the extension does not match the profile being edited. Please switch to the correct account in your extension or use the correct private key.');
        return;
      }

      // If pubkey matches, proceed with signing
      this.sign.emit({ signed: true, key: 'extension' });
    } catch (error) {
      console.error('Error getting public key from extension:', error);
      this.validationError.set('Failed to get public key from extension. Please try again.');
    }
  }

  async signWithPrivateKey() {
    this.validationError.set('');

    if (!this.privateKey()) return;

    try {
      let privateKeyHex = this.privateKey();

      // Convert nsec to hex if needed
      if (this.privateKey().startsWith('nsec')) {
        const decoded = nip19.decode(this.privateKey());
        privateKeyHex = decoded.data as string;
      }

      // Convert hex string to Uint8Array for getPublicKey
      const privateKeyBytes = hexToBytes(privateKeyHex);


      // Get public key from private key using nostr-tools utility
      const derivedPubkey = getPublicKey(privateKeyBytes);

      // Validate that the derived pubkey matches the expected pubkey
      if (derivedPubkey !== this.expectedPubkey) {
        this.validationError.set('The private key provided does not match the profile being edited. Please use the correct private key for this account.');
        return;
      }

      this.sign.emit({ signed: true, key: privateKeyHex });
      this.privateKey.set('');
    } catch (error) {
      console.error('Error validating private key:', error);
      this.validationError.set('Invalid private key format. Please enter a valid nsec key or hex private key.');
    }
  }

  cancel() {
    this.sign.emit({ signed: false });
    this.privateKey.set('');
    this.validationError.set('');
  }
}