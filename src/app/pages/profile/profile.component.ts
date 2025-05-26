import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { FaqItem, RelayService, MemberProfile, BadgeAward } from '../../services/relay.service';
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
import { MarkdownModule } from 'ngx-markdown';

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
    ImageUploadComponent,
    MarkdownModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private relayService = inject(RelayService);

  pubkey!: string;
  npub!: string;
  loading = true;
  profileFound = signal(false);

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
  signingDialogTitle = '';
  signingDialogPurpose: 'profile' | 'badge' = 'profile';
  showDataPreview = true;
  user: NDKUser | null = null;

  // Add new property for relay management
  relays: string[] = [];
  newRelayUrl = '';

  isMobile = false;

  memberProfiles: { [key: string]: MemberProfile } = {};

  // Track badges awarded to members
  memberBadges: { [pubkey: string]: boolean } = {};
  issuingBadge: { [pubkey: string]: boolean } = {};

  constructor() {
    // Initialize with empty states
    this.addFaqItem();
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  reloadPage(): void {
    window.location.reload();
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

      try {
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
      }} catch(err) {
        // Can happen if the pubkey is invalid or malformed
        console.error(err);
        this.profileFound.set(false);
        this.loading = false;
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
        this.profileFound.set(true);
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
      } else {
        this.profileFound.set(false);
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
      this.profileFound.set(false);
    } finally {
      this.loading = false;
    }
  }

  async setActiveTab(tabId: string) {
    this.activeTab = tabId;

    // Load member profiles when switching to members tab
    if (tabId === 'members' && this.members.pubkeys.length > 0) {

      const validPubkeys = this.members.pubkeys.filter(pk => pk && pk.length > 0);
      if (validPubkeys.length > 0) {
        const profiles = await this.relayService.fetchMemberProfiles(validPubkeys);
        
        profiles.forEach(async profile => {
          this.memberProfiles[profile.npub] = profile;
          // Check badge status for each member
          await this.checkMemberBadge(profile.pubkey);
        });
      }

    }
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
        
        // Check if badge has been awarded to this member
        await this.checkMemberBadge(pubkey);
      }
    }
  }

  async checkMemberBadge(pubkey: string) {
    try {
      const badgeDefinitionId = `30009:${this.pubkey}:angor-member`;
      const hasBeenAwarded = await this.relayService.checkBadgeAwarded(
        this.pubkey,
        badgeDefinitionId,
        pubkey
      );
      
      this.memberBadges[pubkey] = hasBeenAwarded;
    } catch (error) {
      console.error('Error checking badge status:', error);
    }
  }

  async issueBadge(memberPubkey: string) {
    try {
      if (this.issuingBadge[memberPubkey]) return;
      
      this.issuingBadge[memberPubkey] = true;
      
      // Show signing dialog for badge issuance
      const memberProfile = Object.values(this.memberProfiles).find(p => p.pubkey === memberPubkey);
      const displayName = memberProfile ? (memberProfile.displayName || memberProfile.name || memberPubkey) : memberPubkey;
      
      this.dataToSign = {
        recipient: displayName,
        badgeName: "Angor Project Member",
        badgeSlug: "angor-project-member",
        memberPubkey: memberPubkey
      };
      
      this.signingDialogTitle = 'Issue Badge';
      this.signingDialogPurpose = 'badge';
      this.showDataPreview = true;
      this.showSigningDialog = true;
    } catch (error) {
      console.error('Error preparing badge issuance:', error);
      this.issuingBadge[memberPubkey] = false;
      alert('Failed to prepare badge issuance. Please try again.');
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

    this.signingDialogTitle = 'Save Profile Changes';
    this.signingDialogPurpose = 'profile';
    this.showDataPreview = true;
    this.showSigningDialog = true;
  }

  async handleSigning(result: { signed: boolean; key?: string }) {
    this.showSigningDialog = false;

    if (!result.signed) {
      // If this was a badge issuance that was cancelled, reset the issuingBadge flag
      if (this.signingDialogPurpose === 'badge' && this.dataToSign?.memberPubkey) {
        this.issuingBadge[this.dataToSign.memberPubkey] = false;
      }
      return;
    }

    try {
      await this.relayService.ensureConnected();
      
      if (result.key === 'extension') {
        const nip07signer = new NDKNip07Signer();
        this.relayService.ndk!.signer = nip07signer;
      } else if (result.key) {
        this.relayService.ndk!.signer = new NDKPrivateKeySigner(result.key);
      } else {
        throw new Error('No signing method provided');
      }

      if (this.signingDialogPurpose === 'badge') {
        const memberPubkey = this.dataToSign.memberPubkey;
        
        // Create or find the badge definition
        const badgeDefinitionId = await this.relayService.createOrFindBadgeDefinition(
          this.pubkey,
          {
            name: "Angor Project Member",
            slug: "angor-project-member",
            description: "This badge recognizes members of an Angor project team",
            image: "https://angor.io/badges/badge-member.webp",
            thumb: "https://angor.io/badges/badge-member-thumb.webp"
          }
        );
        
        // Issue badge to the member
        await this.relayService.awardBadge(
          this.pubkey,
          badgeDefinitionId,
          memberPubkey
        );
        
        // Update badge status
        this.memberBadges[memberPubkey] = true;
        this.issuingBadge[memberPubkey] = false;
        
        alert('Badge issued successfully!');
      } else {
        // Handle profile data saving
        const events = this.relayService.createEventsFromData(
          this.pubkey!,
          this.dataToSign
        );

        for (const event of events) {
          const ndkEvent = new NDKEvent(this.relayService.ndk!, event);
          await ndkEvent.publish();
        }

        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error during signing operation:', error);
      
      // Reset issuingBadge flag if this was a badge operation
      if (this.signingDialogPurpose === 'badge' && this.dataToSign?.memberPubkey) {
        this.issuingBadge[this.dataToSign.memberPubkey] = false;
      }
      
      alert(`Failed to ${this.signingDialogPurpose === 'badge' ? 'issue badge' : 'save profile'}. Please try again.`);
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
