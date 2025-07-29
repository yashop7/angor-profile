import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signing-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div class="bg-secondary-card border border-secondary-border rounded-lg shadow-lg w-full max-w-md p-6">
          <h2 class="text-text text-lg font-semibold mb-4">
            {{ title() || 'Sign Data' }}
          </h2>
          
          <div class="space-y-6">
            <p class="text-text-secondary text-sm">
              {{ getSigningMessage() }}
            </p>
            
            @if (showDataPreview()) {
              <div class="bg-surface-card p-3 rounded text-xs">
                <pre class="text-text whitespace-pre-wrap">{{ getDataPreviewText() }}</pre>
              </div>
            }

            <div class="space-y-4">
              <button 
                class="w-full py-2.5 px-4 rounded font-medium transition-colors hover:opacity-90 bg-accent text-white"
                (click)="signWithExtension()"
              >
                Sign with Extension
              </button>
              <div class="text-center text-sm text-text-secondary">
                OR
              </div>
              <div class="space-y-3">
                <input
                  type="password"
                  [ngModel]="privateKey()"
                  (ngModelChange)="privateKey.set($event)"
                  placeholder="Enter private key (nsec)"
                  class="w-full px-3 py-2.5 rounded outline-none focus:ring-2 focus:ring-accent transition-all bg-surface-card text-text border border-border"
                />
                <button
                  class="w-full py-2.5 px-4 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 bg-surface-card text-text border border-border"
                  [disabled]="!privateKey()"
                  (click)="signWithPrivateKey()"
                >
                  Sign with Private Key
                </button>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-border">
            <button 
              class="w-full py-2 px-4 transition-colors hover:opacity-80 text-text-secondary"
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
  visible = input<boolean>(false);
  dataToSign = input<any>(null);
  title = input<string>('');
  signingPurpose = input<'profile' | 'badge'>('profile');
  showDataPreview = input<boolean>(true);

  sign = output<{ signed: boolean; key?: string }>();

  privateKey = signal('');

  getSigningMessage(): string {
    if (this.signingPurpose() === 'badge') {
      return 'Sign this badge definition and award to issue it to the member.';
    }
    return 'Please sign this data to save your profile changes.';
  }

  getDataPreviewText(): string {
    const data = this.dataToSign();
    if (!data) return '';
    
    if (this.signingPurpose() === 'badge') {
      return `Issuing badge to: ${data.recipient || 'member'}\n` +
             `Badge type: ${data.badgeName || 'Angor Member'}`;
    }
    
    // For profile data, show a summary
    const summary: string[] = [];
    if (data.profile) summary.push('✓ Profile Information');
    if (data.project) summary.push('✓ Project Content');
    if (data.faq) summary.push(`✓ FAQ Items (${data.faq.length})`);
    if (data.members) summary.push(`✓ Members (${data.members.pubkeys?.length || 0})`);
    if (data.media) summary.push(`✓ Media Items (${data.media.length})`);
    
    return summary.join('\n');
  }

  signWithExtension() {
    this.sign.emit({ signed: true, key: 'extension' });
  }

  signWithPrivateKey() {
    if (!this.privateKey()) return;
    this.sign.emit({ signed: true, key: this.privateKey() });
    this.privateKey.set('');
  }

  cancel() {
    this.sign.emit({ signed: false });
    this.privateKey.set('');
  }
}
