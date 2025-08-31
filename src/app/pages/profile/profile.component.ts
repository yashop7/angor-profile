import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { nip19 } from "nostr-tools";

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

  @ViewChild('tabsContainer', { static: false }) tabsContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('projectTextarea', { static: false }) projectTextarea!: ElementRef<HTMLTextAreaElement>;

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

  private validateUrl(url: string, allowedProtocols: string[]): { isValid: boolean; error: string } {
    if (!url || url.trim() === '') {
      return { isValid: true, error: '' };
    }

    const trimurl = url.trim();
    
    const hasValidProtocol = allowedProtocols.some(protocol => trimurl.startsWith(protocol));
    if (!hasValidProtocol) {
      const protocolList = allowedProtocols.join(' or ');
      return { 
        isValid: false, 
        error: `URL must start with ${protocolList}` 
      };
    }

    try {
      new URL(trimurl);
      return { isValid: true, error: '' };
    } catch {
      return { 
        isValid: false, 
        error: 'Please enter a valid URL format' 
      };
    }
  }

  isValidRelayUrl(): boolean {
    const result = this.validateUrl(this.newRelayUrl, ['wss://']);
    return result.isValid;
  }

  getRelayUrlError(): string {
    const result = this.validateUrl(this.newRelayUrl, ['wss://']);
    return result.error;
  }

  isValidMediaUrl(): boolean {
    const result = this.validateUrl(this.newMediaUrl, ['https://', 'http://']);
    return result.isValid;
  }

  getMediaUrlError(): string {
    const result = this.validateUrl(this.newMediaUrl, ['https://', 'http://']);
    return result.error;
  }

  isValidProofUrl(proofUrl: string): boolean {
    const result = this.validateUrl(proofUrl, ['https://']);
    return result.isValid;
  }

  getProofUrlError(proofUrl: string): string {
    const result = this.validateUrl(proofUrl, ['https://']);
    return result.error;
  }

  isValidWebsiteUrl(): boolean {
    const result = this.validateUrl(this.profile.website, ['https://', 'http://']);
    return result.isValid;
  }

  getWebsiteUrlError(): string {
    const result = this.validateUrl(this.profile.website, ['https://', 'http://']);
    return result.error;
  }

  areAllProofUrlsValid(): boolean {
    return this.profile.identityTags.every(link => 
      !link.proof || this.isValidProofUrl(link.proof)
    );
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
        
        // Load badge awards for all members
        await this.loadMemberBadgeAwards();
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
        
        profiles.forEach(profile => {
          this.memberProfiles[profile.npub] = profile;
        });
        
        // Ensure badge awards are loaded
        await this.loadMemberBadgeAwards();
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

  formatProjectText(prefix: string, suffix: string) {
    const textarea = this.projectTextarea?.nativeElement;
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
    this.onContentChange();

    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  }

  formatFaqText(faqId: string, prefix: string, suffix: string) {
    const textarea = document.querySelector(`textarea[data-faq-id="${faqId}"]`) as HTMLTextAreaElement;
    if (!textarea) {
      // Fallback: find the active textarea
      const activeTextarea = document.activeElement as HTMLTextAreaElement;
      if (activeTextarea && activeTextarea.tagName === 'TEXTAREA') {
        this.applyTextFormatting(activeTextarea, prefix, suffix, faqId);
      }
      return;
    }

    this.applyTextFormatting(textarea, prefix, suffix, faqId);
  }

  private applyTextFormatting(textarea: HTMLTextAreaElement, prefix: string, suffix: string, faqId?: string) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const replacement = prefix + selection + suffix;

    textarea.value =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    // Update the model
    if (faqId) {
      const faq = this.faqItems.find(f => f.id === faqId);
      if (faq) {
        faq.answer = textarea.value;
      }
    }

    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  }

  toggleFaqPreview(faqId: string) {
    const faq = this.faqItems.find(f => f.id === faqId);
    if (faq) {
      faq.showPreview = !faq.showPreview;
    }
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
      showPreview: false,
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
      const badgeDefinitionId = `30009:${this.pubkey}:angor-project-member`;
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

  // Add new method to load badge awards for all members at once
  async loadMemberBadgeAwards() {
    if (!this.members.pubkeys || this.members.pubkeys.length === 0) {
      return;
    }

    try {
      // Convert npub to pubkey if needed and filter valid pubkeys
      const validPubkeys = this.members.pubkeys
        .filter(pk => pk && pk.length > 0)
        .map(pk => {
          try {
            // Check if the pubkey starts with 'npub'
            if (pk.startsWith('npub')) {
              const decoded = nip19.decode(pk);
              return decoded.data as string;
            }
            return pk;
          } catch (error) {
            console.error('Error decoding pubkey:', pk, error);
            return null;
          }
        })
        .filter(pk => pk !== null) as string[];

      if (validPubkeys.length === 0) return;

      // Fetch badge awards for all members at once
      const badgeAwards = await this.relayService.fetchMemberBadgeAwards(
        this.pubkey,
        validPubkeys
      );

      // Update memberBadges with the results
      this.memberBadges = { ...this.memberBadges, ...badgeAwards };
    } catch (error) {
      console.error('Error loading member badge awards:', error);
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
    
    if (this.isValidMediaUrl()) {
      this.mediaItems.push({
        url: this.newMediaUrl,
        type: this.newMediaType
      });

      this.newMediaUrl = '';
    }
  }

  removeMedia(index: number) {
    this.mediaItems.splice(index, 1);
  }

  dropMedia(event: CdkDragDrop<MediaItem[]>) {
    moveItemInArray(this.mediaItems, event.previousIndex, event.currentIndex);
  }

  addRelay() {
    if (!this.newRelayUrl) return;
    
    if (this.isValidRelayUrl() && !this.relays.includes(this.newRelayUrl)) {
      this.relays.push(this.newRelayUrl);
      this.newRelayUrl = '';
    }
  }

  removeRelay(index: number) {
    if (this.relays.length > 1) {
      this.relays.splice(index, 1);
    }
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

  scrollTabsLeft() {
    if (this.tabsContainer?.nativeElement) {
      const container = this.tabsContainer.nativeElement;
      const scrollAmount = container.clientWidth / 2;
      container.scrollBy({
        left: -scrollAmount,
      });
    }
  }

  scrollTabsRight() {
    if (this.tabsContainer?.nativeElement) {
      const container = this.tabsContainer.nativeElement;
      const scrollAmount = container.clientWidth / 2;
      container.scrollBy({
        left: scrollAmount,
      });
    }
  }

  isValidNpub(npubKey: string): boolean {
    if (!npubKey || npubKey.trim() === '') return true;
    const input = npubKey.toLowerCase();
    if (input.startsWith('npub')) {
      try {
        nip19.decode(npubKey);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  getNpubError(npubKey: string): string {
    if (!npubKey || npubKey.trim() === '') return '';
    
    const input = npubKey.toLowerCase();
    if (!input.startsWith('npub')) {
      return 'Must be a valid npub (starts with npub)';
    }
    
    try {
      nip19.decode(npubKey);
      return '';
    } catch {
      return 'Invalid npub format';
    }
  }

  canAddTeamMember(): boolean {
    if (this.members.pubkeys.length === 0) return true;
    const lastMemberKey = this.members.pubkeys[this.members.pubkeys.length - 1];
    if (!lastMemberKey || lastMemberKey.trim() === '') return true;
    return this.isValidNpub(lastMemberKey);
  }

  isValidLightningAddress(): boolean {
    if (!this.profile.lud16 || this.profile.lud16.trim() === '') return true;
    
    const address = this.profile.lud16.trim();
    
    if (address.toLowerCase().startsWith('lnurl1')) {
      return address === address.toLowerCase() && address.length > 20 && address.length < 300;
    }
    
    const lightningAddressRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return lightningAddressRegex.test(address);
  }

  getLightningAddressError(): string {
    if (!this.profile.lud16 || this.profile.lud16.trim() === '') return '';
    
    const address = this.profile.lud16.trim();
    
    if (address.toLowerCase().startsWith('lnurl1')) {
      if (address !== address.toLowerCase()) {
        return 'LNURL must be lowercase';
      }
      if (address.length <= 20 || address.length >= 300) {
        return 'Invalid LNURL length';
      }
      return '';
    }
    
    const lightningAddressRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!lightningAddressRegex.test(address)) {
      return 'Please enter a valid lightning address (user@domain.com) or LNURL (lnurl1...)';
    }
    
    return '';
  }
}
