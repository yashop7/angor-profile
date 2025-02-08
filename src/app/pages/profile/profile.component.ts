import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { FaqItem, RelayService, MemberProfile } from '../../services/relay.service';
import { SigningDialogComponent } from '../../components/signing-dialog.component';
import NDK, {
  calculateRelaySetFromEvent,
  NDKEvent,
  NDKNip07Signer,
  NDKPrivateKeySigner,
  NDKUser,
} from '@nostr-dev-kit/ndk';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ImageUploadComponent } from '../../components/image-upload.component';

export interface NostrProfile {
  name: string;
  displayName: string;
  about: string;
  picture: string;
  banner: string;
  nip05: string;
  lud16: string;
  website: string;
  identityTags: IdentityLink[];
}

interface ProjectContent {
  content: string;
  lastUpdated?: number;
}

interface ProjectMembers {
  pubkeys: string[];
}

interface IdentityLink {
  platform: string;
  identity: string;
  proof: string;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent,
    FormsModule,
    SigningDialogComponent,
    DragDropModule,
    ImageUploadComponent
  ],
  template: `
    <section class="hero">
      <app-breadcrumb
        [items]="[
          { label: 'Home', url: '/' },
          { label: 'Profile', url: '' }
        ]"
      ></app-breadcrumb>
      <div class="hero-wrapper">
        <div class="hero-content">
          <h1>Profile Settings</h1>
          <p class="hero-description">
            Manage your Nostr profile information that will be displayed on your
            Angor projects.
          </p>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="tabs" [class.mobile]="isMobile">
        <button
          *ngFor="let tab of tabs"
          [class.active]="activeTab === tab.id"
          (click)="setActiveTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content" [ngSwitch]="activeTab">
        <div *ngSwitchCase="'profile'" class="profile-section">
          <h2>Basic Information</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="name">Username</label>
              <input
                id="name"
                type="text"
                [(ngModel)]="profile.name"
                placeholder="Your username"
              />
            </div>

            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                [(ngModel)]="profile.displayName"
                placeholder="Your display name"
              />
            </div>

            <div class="form-group full-width">
              <label for="about">About</label>
              <textarea
                id="about"
                [(ngModel)]="profile.about"
                placeholder="Tell us about yourself"
                rows="4"
              ></textarea>
            </div>

            <div class="form-group full-width">
              <label>Profile Picture</label>
              <app-image-upload 
                label="Profile Picture"
                [imageUrl]="profile.picture"
                (urlChanged)="profile.picture = $event"
              ></app-image-upload>
            </div>

            <div class="form-group full-width">
              <label>Banner Image</label>
              <app-image-upload 
                label="Banner Image"
                [imageUrl]="profile.banner"
                (urlChanged)="profile.banner = $event"
              ></app-image-upload>
            </div>

            <div class="form-group">
              <label for="nip05">NIP-05 Verification</label>
              <input
                id="nip05"
                type="text"
                [(ngModel)]="profile.nip05"
                placeholder="you@example.com"
              />
            </div>

            <div class="form-group">
              <label for="lud16">Lightning Address</label>
              <input
                id="lud16"
                type="text"
                [(ngModel)]="profile.lud16"
                placeholder="your@lightning.address"
              />
            </div>

            <div class="form-group">
              <label for="website">Website</label>
              <input
                id="website"
                type="url"
                [(ngModel)]="profile.website"
                placeholder="https://your-website.com"
              />
            </div>
          </div>
        </div>

        <div *ngSwitchCase="'project'" class="profile-section">
          <h2>Project Description</h2>
          <p class="helper-text">
            Write a detailed description of your project. This will be displayed
            as your main project content.
          </p>

          <div class="editor-container">
            <div class="editor-toolbar">
              <button
                class="tool-button"
                (click)="formatText('**', '**')"
                title="Bold"
              >
                B
              </button>
              <button
                class="tool-button"
                (click)="formatText('*', '*')"
                title="Italic"
              >
                I
              </button>
              <button
                class="tool-button"
                (click)="formatText('### ', '')"
                title="Heading"
              >
                H
              </button>
              <button
                class="tool-button"
                (click)="formatText('- ', '')"
                title="List Item"
              >
                •
              </button>
              <button
                class="tool-button"
                (click)="formatText('[', '](url)')"
                title="Link"
              >
                🔗
              </button>
            </div>

            <div class="textarea-wrapper">
              <textarea
                [(ngModel)]="projectContent.content"
                placeholder="Write your project description here... Use Markdown for formatting."
                rows="20"
                (input)="onContentChange()"
              ></textarea>

              <div *ngIf="projectContent.lastUpdated" class="last-updated">
                Last updated: {{ formatDate(projectContent.lastUpdated) }}
              </div>
            </div>

            <div class="preview-toggle">
              <button (click)="togglePreview()" class="secondary-button">
                {{ showPreview ? 'Edit' : 'Preview' }}
              </button>
            </div>

            <div *ngIf="showPreview" class="markdown-preview">
              <!-- TODO: Add markdown preview rendering -->
              <pre>{{ projectContent.content }}</pre>
            </div>
          </div>
        </div>

        <div *ngSwitchCase="'faq'" class="profile-section">
          <h2>Frequently Asked Questions</h2>
          <p class="helper-text">
            Add questions and answers that will help users understand your
            project better.
          </p>

          <div class="faq-container">
            <div
              *ngFor="let faq of faqItems; trackBy: trackById"
              class="faq-item"
            >
              <div class="faq-header">
                <button
                  class="delete-button"
                  (click)="deleteFaqItem(faq.id)"
                  title="Delete question"
                >
                  ×
                </button>
              </div>
              <div class="form-group">
                <label>Question</label>
                <input
                  type="text"
                  [(ngModel)]="faq.question"
                  placeholder="Enter your question"
                />
              </div>
              <div class="form-group">
                <label>Answer</label>
                <textarea
                  [(ngModel)]="faq.answer"
                  rows="4"
                  placeholder="Enter your answer"
                ></textarea>
              </div>
            </div>

            <button class="add-faq-button" (click)="addFaqItem()">
              + Add New Question
            </button>
          </div>
        </div>

        <div *ngSwitchCase="'members'" class="profile-section">
          <h2>Team Members</h2>
          <p class="helper-text">
            Add Nostr public keys of team members who can manage this project.
          </p>

          <div class="members-container">
            <div
              *ngFor="
                let pubkey of members.pubkeys;
                let i = index;
                trackBy: trackByIndex
              "
              class="member-item"
            >
              <div class="member-input-group">
                <input
                  type="text"
                  [(ngModel)]="members.pubkeys[i]"
                  (ngModelChange)="onMemberKeyChange(i)"
                  placeholder="npub..."
                  class="member-input"
                />
                <button class="delete-button" (click)="removeMember(i)">×</button>
              </div>
              
              <div *ngIf="memberProfiles[pubkey]" class="member-profile">
                <img 
                  *ngIf="memberProfiles[pubkey].picture"
                  [src]="memberProfiles[pubkey].picture" 
                  class="member-avatar"
                  alt="Profile picture"
                />
                <div class="member-info">
                  <div class="member-name">
                    {{ memberProfiles[pubkey].displayName || memberProfiles[pubkey].name }}
                  </div>
                  <div class="member-nip05" *ngIf="memberProfiles[pubkey].nip05">
                    ✓ {{ memberProfiles[pubkey].nip05 }}
                  </div>
                  <div class="member-about" *ngIf="memberProfiles[pubkey].about">
                    {{ memberProfiles[pubkey].about }}
                  </div>
                </div>
              </div>
            </div>

            <button class="add-member-button" (click)="addMember()">
              + Add Team Member
            </button>
          </div>
        </div>

        <div *ngSwitchCase="'links'" class="profile-section">
          <h2>External Identities</h2>
          <p class="helper-text">
            Link your external identities and social media accounts. Add proof links to verify ownership.
          </p>

          <div class="links-container">
            <div *ngFor="let link of profile.identityTags; let i = index" class="link-item">
              <div class="link-inputs">
                <select [(ngModel)]="link.platform" class="platform-select" autocomplete="off">
                  <option value="">Select Platform</option>
                  <option *ngFor="let platform of platformSuggestions" [value]="platform">
                    {{platform}}
                  </option>
                  <option value="custom">Custom</option>
                </select>
                
                <input
                  type="text"
                  [(ngModel)]="link.identity"
                  placeholder="Username or ID"
                  class="identity-input"
                  autocomplete="off"
                />
                
                <input
                  type="text"
                  [(ngModel)]="link.proof"
                  placeholder="Proof URL or identifier"
                  class="proof-input"
                  autocomplete="off"
                />
              </div>
              
              <button class="delete-button" (click)="removeIdentityLink(i)">×</button>
            </div>

            <button class="add-link-button" (click)="addIdentityLink()">
              + Add Identity Link
            </button>
          </div>
        </div>

        <div *ngSwitchCase="'media'" class="profile-section">
          <h2>Media Gallery</h2>
          <p class="helper-text">
            Add links to images or videos that showcase your project.
          </p>

          <div class="media-container">
            <div class="media-input">
              <input
                type="text"
                [(ngModel)]="newMediaUrl"
                placeholder="Enter media URL (image or video)"
                class="media-url-input"
              />
              <select [(ngModel)]="newMediaType" class="media-type-select">
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
              <button class="primary-button" (click)="addMedia()">Add Media</button>
            </div>

            <div cdkDropList class="media-grid" (cdkDropListDropped)="dropMedia($event)">
              <div *ngFor="let item of mediaItems; let i = index" 
                   class="media-item" cdkDrag>
                <div class="media-preview">
                  <img *ngIf="item.type === 'image'" [src]="item.url" alt="Media preview">
                  <video *ngIf="item.type === 'video'" [src]="item.url" controls></video>
                </div>
                <div class="media-controls">
                  <button class="move-button" cdkDragHandle>⋮⋮</button>
                  <button class="delete-button" (click)="removeMedia(i)">×</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngSwitchCase="'relays'" class="profile-section">
          <h2>Relay Servers</h2>
          <p class="helper-text">
            Manage the relay servers that your profile will connect to. These relays will be used to publish and retrieve your project data.
          </p>

          <div class="relays-container">
            <div class="relay-input">
              <input
                type="text"
                [(ngModel)]="newRelayUrl"
                placeholder="wss://relay.example.com"
                class="relay-url-input"
                (keyup.enter)="addRelay()"
              />
              <button class="primary-button" (click)="addRelay()">Add Relay</button>
            </div>

            <div class="relay-list">
              <div *ngFor="let relay of relays; let i = index" class="relay-item">
                <span class="relay-url">{{relay}}</span>
                <button class="delete-button" (click)="removeRelay(i)" 
                        [disabled]="relays.length === 1">×</button>
              </div>
            </div>

            <div class="relay-actions">
              <button class="primary-button" (click)="applyAndConnect()">Apply and Connect</button>
            </div>
          </div>
        </div>

        <div *ngIf="isMobile" class="mobile-navigation">
          <button 
            class="nav-button previous" 
            (click)="previousTab()"
            *ngIf="activeTab !== tabs[0].id">
            ← Previous
          </button>
          <button 
            class="nav-button next" 
            (click)="nextTab()"
            *ngIf="activeTab !== tabs[tabs.length-1].id">
            Next →
          </button>
        </div>
      </div>

      <div class="actions">
        <button class="secondary-button" (click)="resetChanges()">
          Reset Changes
        </button>
        <button class="primary-button" (click)="saveProfile()">
          Save Profile
        </button>
      </div>
    </div>

    <app-signing-dialog
      [visible]="showSigningDialog"
      [dataToSign]="dataToSign"
      (sign)="handleSigning($event)"
    ></app-signing-dialog>


  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 1rem;
        margin: 2rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0;
      }

      .tabs button {
        background: none;
        border: none;
        padding: 0.75rem 1.5rem;
        cursor: pointer;
        color: var(--text);
        font-size: 1rem;
        position: relative;
        transition: all 0.3s ease;
        opacity: 0.7;
      }

      .tabs button:hover {
        opacity: 1;
        background: var(--surface-hover);
      }

      .tabs button.active {
        color: var(--accent);
        opacity: 1;
      }

      .tabs button.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--accent);
      }

      .tabs.mobile {
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
      }

      .tabs.mobile button {
        font-size: 0.9rem;
        padding: 0.5rem 1rem;
      }

      @media (max-width: 768px) {
        .tabs {
          display: none;
        }

        .profile-section {
          margin: 1rem;
          padding: 1rem;
        }

        .mobile-navigation {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 2rem;
          padding: 0 1rem;
        }

        .nav-button {
          padding: 0.75rem 1.5rem;
          background: var(--surface-card);
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-button:hover {
          background: var(--surface-hover);
          transform: translateY(-1px);
        }

        .nav-button.previous {
          padding-left: 1rem;
        }

        .nav-button.next {
          padding-right: 1rem;
        }
      }

      /* Add current step indicator for mobile */
      .mobile-step-indicator {
        text-align: center;
        color: var(--text-secondary);
        margin: 1rem 0;
        font-size: 0.9rem;
      }

      .profile-section {
        background: var(--surface-card);
        padding: 2rem;
        border-radius: 8px;
        margin: 2rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group.full-width {
        grid-column: 1 / -1;
      }

      label {
        font-weight: 500;
        color: var(--text);
      }

      input,
      textarea {
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: 4px;
        background: var(--surface-ground);
        color: var(--text);
        font-size: 1rem;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: var(--accent);
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin: 2rem;
      }

      .primary-button,
      .secondary-button {
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .primary-button {
        background: var(--accent);
        color: white;
        border: none;
      }

      .secondary-button {
        background: var(--surface-card);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .primary-button:hover,
      .secondary-button:hover {
        transform: translateY(-1px);
      }

      .editor-container {
        margin-top: 1.5rem;
      }

      .editor-toolbar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background: var(--surface-ground);
        border: 1px solid var(--border);
        border-radius: 4px;
      }

      .tool-button {
        padding: 0.5rem 1rem;
        background: var(--surface-card);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s ease;
      }

      .tool-button:hover {
        background: var(--surface-hover);
      }

      .textarea-wrapper {
        position: relative;
      }

      textarea {
        width: 100%;
        min-height: 200px; /* Reduced height */
        padding: 1rem;
        font-family: monospace;
        line-height: 1.6;
        resize: vertical;
      }

      .last-updated {
        position: absolute;
        bottom: 0.5rem;
        right: 0.5rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        background: var(--surface-ground);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }

      .preview-toggle {
        margin: 1rem 0;
        text-align: right;
      }

      .markdown-preview {
        padding: 1rem;
        background: var(--surface-ground);
        border: 1px solid var(--border);
        border-radius: 4px;
        min-height: 400px;
      }

      .helper-text {
        color: var(--text-secondary);
        margin-bottom: 1rem;
      }

      .faq-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      .faq-item {
        background: var(--surface-ground);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.5rem;
        position: relative;
      }

      .faq-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .delete-button {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        line-height: 1;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .delete-button:hover {
        background: var(--surface-hover);
        color: var(--accent);
      }

      .add-faq-button {
        background: var(--surface-card);
        border: 2px dashed var(--border);
        color: var(--text);
        padding: 1rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
        width: 100%;
      }

      .add-faq-button:hover {
        background: var(--surface-hover);
        border-color: var(--accent);
        color: var (--accent);
      }

      .members-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .member-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .member-input {
        flex: 1;
      }

      .add-member-button {
        background: var(--surface-card);
        border: 2px dashed var(--border);
        color: var(--text);
        padding: 1rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
        width: 100%;
        margin-top: 1rem;
      }

      .add-member-button:hover {
        background: var(--surface-hover);
        border-color: var(--accent);
        color: var(--accent);
      }

      .links-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .link-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        background: var(--surface-ground);
        padding: 1rem;
        border-radius: 4px;
      }

      .link-inputs {
        display: flex;
        gap: 0.5rem;
        flex: 1;
      }

      .platform-select {
        width: 150px;
      }

      .identity-input,
      .proof-input {
        flex: 1;
      }

      .add-link-button {
        background: var(--surface-card);
        border: 2px dashed var(--border);
        color: var(--text);
        padding: 1rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
        width: 100%;
        margin-top: 1rem;
      }

      .add-link-button:hover {
        background: var(--surface-hover);
        border-color: var (--accent);
        color: var(--accent);
      }

      .media-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .media-input {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .media-url-input {
        flex: 1;
      }

      .media-type-select {
        width: 120px;
      }

      .media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .media-item {
        position: relative;
        background: var(--surface-ground);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
      }

      .media-preview {
        aspect-ratio: 16/9;
        overflow: hidden;
      }

      .media-preview img,
      .media-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .media-controls {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: flex;
        gap: 0.5rem;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .media-item:hover .media-controls {
        opacity: 1;
      }

      .media-controls button {
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
      }

      .media-controls button:hover {
        background: rgba(0, 0, 0, 0.7);
      }

      .relays-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      .relay-input {
        display: flex;
        gap: 0.5rem;
      }

      .relay-url-input {
        flex: 1;
      }

      .relay-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .relay-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--surface-ground);
        padding: 0.75rem 1rem;
        border-radius: 4px;
      }

      .relay-url {
        font-family: monospace;
        word-break: break-all;
      }

      .relay-item .delete-button[disabled] {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .relay-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
      }

      .member-input-group {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .member-profile {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: var(--surface-ground);
        border-radius: 4px;
        margin-bottom: 1rem;
      }

      .member-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
      }

      .member-info {
        flex: 1;
      }

      .member-name {
        font-weight: 500;
        margin-bottom: 0.25rem;
      }

      .member-nip05 {
        font-size: 0.9rem;
        color: var(--accent);
        margin-bottom: 0.25rem;
      }

      .member-about {
        font-size: 0.9rem;
        color: var(--text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private relayService = inject(RelayService);

  pubkey!: string;
  npub!: string;
  loading = true;

  tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'project', label: 'Project' },
    { id: 'faq', label: 'FAQ' },
    { id: 'members', label: 'Members' },
    { id: 'links', label: 'Links' },
    { id: 'media', label: 'Media' },
    { id: 'relays', label: 'Relays' }

  ];

  activeTab = 'profile';

  profile: NostrProfile = {
    name: '',
    displayName: '',
    about: '',
    picture: '',
    banner: '',
    nip05: '',
    lud16: '',
    website: '',
    identityTags: []
  };

  projectContent: ProjectContent = {
    content: '',
    lastUpdated: undefined,
  };

  faqItems: FaqItem[] = [];

  members: ProjectMembers = {
    pubkeys: [],
  };

  mediaItems: MediaItem[] = [];
  newMediaUrl = '';
  newMediaType: 'image' | 'video' = 'image';

  platformSuggestions = [
    'github',
    'twitter',
    'mastodon',
    'telegram',
    'discord',
    'linkedin',
    'facebook',
    'instagram'
  ];

  showPreview = false;
  showSigningDialog = false;
  dataToSign: any = null;
  user: NDKUser | null = null;

  // Add new property for relay management
  relays: string[] = [];
  newRelayUrl = '';

  isMobile = false;

  memberProfiles: { [key: string]: MemberProfile } = {};

  constructor() {
    // Initialize with empty states
    this.addFaqItem();
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  nextTab() {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    if (currentIndex < this.tabs.length - 1) {
      this.activeTab = this.tabs[currentIndex + 1].id;
    }
  }

  previousTab() {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    if (currentIndex > 0) {
      this.activeTab = this.tabs[currentIndex - 1].id;
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const pubkey = params.get('pubkey');
      if (pubkey) {
        if (pubkey.startsWith('npub')) {
          this.user = new NDKUser({
            npub: pubkey,
            relayUrls: this.relayService.relayUrls,
          });
        } else {
          this.user = new NDKUser({
            pubkey: pubkey,
            relayUrls: this.relayService.relayUrls,
          });
        }

        this.npub = this.user.npub;
        this.pubkey = this.user.pubkey;

        this.loadProfileData(this.pubkey);
      }
    });

    // Initialize relays from the relay service
    this.relays = [...this.relayService.relayUrls];
  }

  async loadProfileData(pubkey: string) {
    this.loading = true;
    try {
      const profileData = await this.relayService.loadProfileMetadata(pubkey);
      if (profileData) {
        console.log('Loaded profile:', profileData);
        this.profile = {
          name: profileData.name || '',
          displayName: profileData.displayName || '',
          about: profileData.about || '',
          picture: profileData.picture || '',
          banner: profileData.banner || '',
          nip05: profileData.nip05 || '',
          lud16: profileData.lud16 || '',
          website: profileData.website || '',
          identityTags: []
        };

        // Extract identity tags from the event tags
        const identityTags: IdentityLink[] = [];
        const event = await this.relayService.getProfileEvent(pubkey);

        if (event && event.tags) {
          event.tags.forEach(tag => {
            if (tag[0] === 'i' && tag.length >= 3) {
              const [platform, identity] = tag[1].split(':');
              identityTags.push({
                platform,
                identity,
                proof: tag[2]
              });
            }
          });
        }

        this.profile.identityTags = identityTags;
      }

      const projectData = await this.relayService.loadProjectContent(pubkey);
      if (projectData) {
        this.projectContent = {
          content: projectData.content || '',
          lastUpdated: projectData.created_at,
        };
      }

      const faqData = await this.relayService.loadFaqContent(pubkey);
      if (faqData && Array.isArray(faqData)) {
        this.faqItems = faqData;
      }

      const membersData = await this.relayService.loadMembers(pubkey);
      if (membersData) {
        this.members = {
          pubkeys: membersData.pubkeys || [],
        };
      }

      const mediaData = await this.relayService.loadMediaContent(pubkey);
      if (mediaData) {
        this.mediaItems = mediaData;
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      this.loading = false;
    }
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

  formatText(prefix: string, suffix: string) {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const replacement = prefix + selection + suffix;

    textarea.value =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    this.projectContent.content = textarea.value;

    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  onContentChange() {
    this.projectContent.lastUpdated = Date.now();
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  addFaqItem() {
    this.faqItems.push({
      id: crypto.randomUUID(),
      question: '',
      answer: '',
    });
  }

  deleteFaqItem(id: string) {
    this.faqItems = this.faqItems.filter((item) => item.id !== id);
  }

  async loadMembers() {
    const members = await this.relayService.loadMembers(this.pubkey);
    if (members) {
      this.members = members;
    } else {
      this.members = { pubkeys: [] };
    }
  }

  async addMember() {
    this.members.pubkeys.push('');
  }

  removeMember(index: number) {
    this.members.pubkeys.splice(index, 1);
  }

  async onMemberKeyChange(index: number) {
    const pubkey = this.members.pubkeys[index];
    if (pubkey && pubkey.length > 0) {
      const profiles = await this.relayService.fetchMemberProfiles([pubkey]);
      if (profiles.length > 0) {
        this.memberProfiles[pubkey] = profiles[0];
      }
    }
  }

  addIdentityLink() {
    this.profile.identityTags.push({
      platform: '',
      identity: '',
      proof: ''
    });
  }

  removeIdentityLink(index: number) {
    this.profile.identityTags.splice(index, 1);
  }

  addMedia() {
    if (!this.newMediaUrl) return;
    
    this.mediaItems.push({
      url: this.newMediaUrl,
      type: this.newMediaType
    });

    this.newMediaUrl = '';
  }

  removeMedia(index: number) {
    this.mediaItems.splice(index, 1);
  }

  dropMedia(event: CdkDragDrop<MediaItem[]>) {
    moveItemInArray(this.mediaItems, event.previousIndex, event.currentIndex);
  }

  addRelay() {
    if (!this.newRelayUrl) return;
    
    // Basic validation for wss:// or ws:// protocol
    if (!this.newRelayUrl.startsWith('wss://') && !this.newRelayUrl.startsWith('ws://')) {
      this.newRelayUrl = 'wss://' + this.newRelayUrl;
    }
    
    if (!this.relays.includes(this.newRelayUrl)) {
      this.relays.push(this.newRelayUrl);
    }
    
    this.newRelayUrl = '';
  }

  removeRelay(index: number) {
    this.relays.splice(index, 1);
  }

  async applyAndConnect() {
    try {
      // Update relay URLs in the service
      this.relayService.relayUrls = [...this.relays];
      
      // Recreate NDK instance with new relays
      await this.relayService.reconnectWithRelays(this.relays);
      
      // Refresh user instance with new relays
      if (this.user) {
        this.user = new NDKUser({
          pubkey: this.pubkey,
          relayUrls: this.relays,
        });
      }

      alert('Successfully connected to new relay set');
    } catch (error) {
      console.error('Error reconnecting to relays:', error);
      alert('Failed to connect to new relay set');
    }
  }

  saveProfile() {
    if (!this.pubkey) return;

    this.dataToSign = {
      profile: this.profile,
      project: this.projectContent,
      faq: this.faqItems,
      members: this.members,
      media: this.mediaItems
    };

    this.showSigningDialog = true;
  }

  async handleSigning(result: { signed: boolean; key?: string }) {
    this.showSigningDialog = false;

    if (!result.signed) {
      return;
    }

    try {
      await this.relayService.ensureConnected();

      const nip07signer = new NDKNip07Signer();
      this.relayService.ndk!.signer = nip07signer;

      const events = this.relayService.createEventsFromData(
        this.pubkey!,
        this.dataToSign
      );

      if (result.key === 'extension') {
        for (const event of events) {
          const ndkEvent = new NDKEvent(this.relayService.ndk!, event);
          const published = await ndkEvent.publish();
          console.log('PUBLISHED: ', published);
        }
      } else if (result.key) {
        this.relayService.ndk!.signer = new NDKPrivateKeySigner(result.key);

        for (const event of events) {
          const ndkEvent = new NDKEvent(this.relayService.ndk!, event);
          const published = await ndkEvent.publish();
          console.log('PUBLISHED: ', published);
        }
      }

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    }
  }

  resetChanges() {
    const originalData = this.relayService.getOriginalProfileData(this.pubkey!);
    if (originalData) {
      this.profile = this.relayService.deepClone(originalData);
    }
  }

  trackById(index: number, item: FaqItem) {
    return item.id;
  }
}
