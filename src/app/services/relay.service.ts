import { Injectable, signal, effect } from '@angular/core';
import { SimplePool, Filter, Event, Relay, getEventHash } from 'nostr-tools';
import NDK, {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKUserProfile,
  NDKNip07Signer,
} from '@nostr-dev-kit/ndk';
import { Subject } from 'rxjs';
import { NostrProfile } from '../pages/profile/profile.component';

export interface ProfileUpdate {
  pubkey: string;
  profile: NDKUserProfile;
}

export interface ProjectUpdate {
  founderKey: string;
  founderRecoveryKey: string;
  projectIdentifier: string;
  nostrPubKey: string;
  startDate: number;
  penaltyDays: number;
  expiryDate: number;
  targetAmount: number;
  stages: [{ amountToRelease: number; releaseDate: number }];
  projectSeeders: { threshold: number; secretHashes: string[] }[];
}

// Update ProjectEvent interface to use NDKUserProfile
interface ProjectEvent extends Event {
  details?: {
    nostrPubKey: string;
    projectIdentifier: string;
    // ...other details fields
  };
  metadata?: NDKUserProfile;
}

export interface ProjectMembers {
  pubkeys: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ProjectContent {
  content: string;
  created_at?: number;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

@Injectable({
  providedIn: 'root',
})
export class RelayService {
  private pool = new SimplePool();
  public ndk: NDK | null = null;
  private isConnected = false;
  public relayUrls = [
    'wss://relay.primal.net',
    'wss://nos.lol',
    // 'wss://relay.angor.io',
    'wss://relay2.angor.io',
  ];

  private connectedRelays = signal<string[]>([]);
  public projects = signal<ProjectEvent[]>([]);
  public loading = signal<boolean>(false);
  public profileUpdates = new Subject<ProfileUpdate>();
  public projectUpdates = new Subject<ProjectUpdate>();

  private originalProfileData: { [key: string]: any } = {};

  constructor() {
    this.initializeRelays();

    effect(() => {
      // Automatically fetch projects when relays are connected
      if (this.connectedRelays().length > 0) {
        this.subscribeToProjects();
      }
    });
  }

  public async ensureConnected(): Promise<NDK> {
    if (this.ndk && this.isConnected) {
      return this.ndk;
    }

    if (!this.ndk) {
      this.ndk = new NDK({
        explicitRelayUrls: this.relayUrls,
      });
    }

    try {
      await this.ndk.connect();
      this.isConnected = true;
      return this.ndk;
    } catch (error) {
      console.error('Failed to connect to relays:', error);
      throw error;
    }
  }

  private async initializeRelays() {
    this.loading.set(true);

    try {
      await this.ensureConnected();
    } catch (error) {
      console.error('Failed to initialize relays:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  async fetchData(ids: string[]): Promise<void> {
    try {
      const ndk = await this.ensureConnected();
      // Split pubkeys into batches of 10
      const batches = this.batchArray(ids, 1);

      for (const batch of batches) {
        const filter = {
          kinds: [NDKKind.AppSpecificData],
          ids: ids,
        };

        const sub = ndk.subscribe(filter);
        const timeout = setTimeout(() => {
          // sub.close();
        }, 5000);

        sub.on('event', (event: NDKEvent) => {
          try {
            const projectDetails = JSON.parse(event.content);
            this.fetchProfile([projectDetails.nostrPubKey]);
            this.projectUpdates.next(projectDetails);
          } catch (error) {
            console.error('Failed to parse profile:', error);
          }
        });

        // Wait for each batch to complete
        await new Promise((resolve) => {
          sub.on('eose', () => {
            clearTimeout(timeout);
            // sub.close();
            resolve(null);
          });
        });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }

  async fetchProfile(pubkeys: string[]): Promise<void> {
    try {
      const ndk = await this.ensureConnected();
      const batches = this.batchArray(pubkeys, 20);

      for (const batch of batches) {
        const filter = {
          kinds: [0],
          authors: batch,
          limit: 1,
        };

        const sub = ndk.subscribe(filter);

        const timeout = setTimeout(() => {
          // sub.close();
        }, 5000);

        sub.on('event', (event: NDKEvent) => {
          try {
            const profile = JSON.parse(event.content);
            this.profileUpdates.next({
              pubkey: event.pubkey,
              profile,
            });
          } catch (error) {
            console.error('Failed to parse profile:', error);
          }
        });

        // Wait for batch completion
        await new Promise((resolve) => {
          sub.on('eose', () => {
            clearTimeout(timeout);
            resolve(null);
          });
        });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }

  private subscribeToProjects() {
    // this.loading.set(true);
    // const filter: Filter = {
    //   kinds: [1],
    //   tags: [['t', 'project']],
    //   limit: 100,
    // };
    // let sub = this.pool.sub(this.relayUrls, [filter]);
    // sub.on('event', (event: Event) => {
    //   this.projects.update((projects) => [...projects, event]);
    // });
    // sub.on('eose', () => {
    //   this.loading.set(false);
    //   sub.unsub();
    // });
  }

  public async loadMembers(
    pubkey: string | null
  ): Promise<ProjectMembers | null> {
    try {
      const ndk = await this.ensureConnected();
      const filter = {
        kinds: [NDKKind.AppSpecificData],
        '#d': ['angor:members'],
        authors: pubkey ? [pubkey] : [],
        limit: 1,
      };

      const event = await ndk.fetchEvent(filter);
      if (event) {
        return JSON.parse(event.content);
      }
      return null;
    } catch (error) {
      console.error('Error loading members:', error);
      return null;
    }
  }

  public async saveMembers(pubkey: string, members: ProjectMembers) {
    try {
      const ndk = await this.ensureConnected();
      const event = new NDKEvent(ndk);

      event.kind = NDKKind.AppSpecificData;
      event.content = JSON.stringify(members);
      event.tags = [['d', 'angor:members']];

      await event.publish();
    } catch (error) {
      console.error('Error saving members:', error);
      throw error;
    }
  }

  async loadProfileMetadata(
    pubkey: string | null
  ): Promise<NostrProfile | null> {
    try {
      const ndk = await this.ensureConnected();
      const filter: NDKFilter = {
        kinds: [0],
        authors: [pubkey!],
        limit: 1,
      };

      // Fetch the most recent profile event
      const events = await ndk.fetchEvents(filter);

      let latestEvent: NDKEvent | null = null;

      // Find the most recent event
      for (const event of events) {
        if (!latestEvent || event.created_at! > latestEvent.created_at!) {
          latestEvent = event;
        }
      }

      if (latestEvent) {
        try {
          const profileData = JSON.parse(latestEvent.content);
          const profile = {
            name: profileData.name || '',
            displayName: profileData.display_name || profileData.displayName || '',
            about: profileData.about || '',
            picture: profileData.picture || '',
            banner: profileData.banner || '',
            nip05: profileData.nip05 || '',
            lud16: profileData.lud16 || '',
            website: profileData.website || '',
            identityTags: profileData.identityTags || []
          };
          
          // Store original data
          this.originalProfileData[pubkey!] = this.deepClone(profile);
          
          return profile;
        } catch (error) {
          console.error('Error parsing profile data:', error);
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading profile metadata:', error);
      return null;
    }
  }

  // Add method to get original data
  getOriginalProfileData(pubkey: string): NostrProfile | null {
    return this.originalProfileData[pubkey] || null;
  }

  async loadProjectContent(pubkey: string): Promise<any | null> {
    try {
      const ndk = await this.ensureConnected();
      const filter = {
        kinds: [NDKKind.AppSpecificData],
        authors: [pubkey],
        '#d': ['angor:project'],
        limit: 1,
      };

      const event = await ndk.fetchEvent(filter);
      if (event) {
        return {
          content: event.content,
          created_at: event.created_at,
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading project content:', error);
      return null;
    }
  }

  async loadFaqContent(pubkey: string): Promise<FaqItem[] | null> {
    try {
      const ndk = await this.ensureConnected();
      const filter = {
        kinds: [NDKKind.AppSpecificData],
        authors: [pubkey],
        '#d': ['angor:faq'],
        limit: 1,
      };

      const event = await ndk.fetchEvent(filter);
      if (event) {
        // Add IDs to loaded FAQ items
        const faqItems = JSON.parse(event.content);
        return faqItems.map((item: any) => ({
          ...item,
          id: crypto.randomUUID()
        }));
      }
      return null;
    } catch (error) {
      console.error('Error loading FAQ content:', error);
      return null;
    }
  }

  public async loadMediaContent(pubkey: string): Promise<MediaItem[] | null> {
    try {
      const ndk = await this.ensureConnected();
      const filter = {
        kinds: [NDKKind.AppSpecificData],
        authors: [pubkey],
        '#d': ['angor:media'],
        limit: 1,
      };

      const event = await ndk.fetchEvent(filter);
      if (event) {
        return JSON.parse(event.content);
      }
      return null;
    } catch (error) {
      console.error('Error loading media content:', error);
      return null;
    }
  }

  async saveProfileMetadata(pubkey: string, profile: NostrProfile) {
    try {
      const ndk = await this.ensureConnected();
      const event = new NDKEvent(ndk);
      event.kind = 0;
      event.content = JSON.stringify(profile);
      await event.publish();
    } catch (error) {
      console.error('Error saving profile metadata:', error);
      throw error;
    }
  }

  async saveProjectContent(pubkey: string, content: ProjectContent) {
    try {
      const ndk = await this.ensureConnected();
      const event = new NDKEvent(ndk);
      event.kind = NDKKind.AppSpecificData;
      event.content = content.content;
      event.tags = [['d', 'angor:project']];
      await event.publish();
    } catch (error) {
      console.error('Error saving project content:', error);
      throw error;
    }
  }

  async saveFaqContent(pubkey: string, faq: FaqItem[]) {
    try {
      const ndk = await this.ensureConnected();
      const event = new NDKEvent(ndk);
      event.kind = NDKKind.AppSpecificData;
      // Only save question and answer, strip the id
      const faqContent = faq.map(({ question, answer }) => ({ question, answer }));
      event.content = JSON.stringify(faqContent);
      event.tags = [['d', 'angor:faq']];
      await event.publish();
    } catch (error) {
      console.error('Error saving FAQ content:', error);
      throw error;
    }
  }

  async saveMediaContent(pubkey: string, media: MediaItem[]) {
    try {
      const ndk = await this.ensureConnected();
      const event = new NDKEvent(ndk);
      event.kind = NDKKind.AppSpecificData;
      event.content = JSON.stringify(media);
      event.tags = [['d', 'angor:media']];
      await event.publish();
    } catch (error) {
      console.error('Error saving media content:', error);
      throw error;
    }
  }

  async saveProfileWithExtension(pubkey: string, data: any) {
    if (!window.nostr) {
      throw new Error('Nostr extension not found');
    }

    try {
      // Create and sign events using the extension
      const profileEvent = await window.nostr.signEvent({
        kind: 0,
        content: JSON.stringify(data.profile),
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        pubkey: pubkey,
      });
      const projectEvent = await window.nostr.signEvent({
        kind: 30078,
        content: JSON.stringify(data.project),
        created_at: Math.floor(Date.now() / 1000),
        tags: [['d', 'angor:project']],
        pubkey: pubkey,
      });

      // ... similar for FAQ and members events

      // Publish events
      await this.publishEvent(profileEvent);
      await this.publishEvent(projectEvent);
      // ... publish other events
    } catch (error) {
      console.error('Error signing with extension:', error);
      throw error;
    }
  }

  async saveProfileWithKey(pubkey: string, data: any, privateKey: string) {
    try {
      // Sign and publish events using the private key
      // Note: You'll need to implement the actual signing logic using a Nostr library
      // This is just a placeholder
      const events = this.createEventsFromData(pubkey, data);
      const signedEvents = events.map((event) =>
        this.signEvent(event, privateKey)
      );

      // Publish all signed events
      await Promise.all(signedEvents.map((event) => this.publishEvent(event)));
    } catch (error) {
      console.error('Error signing with key:', error);
      throw error;
    }
  }

  async getProfileEvent(pubkey: string): Promise<NDKEvent | null> {
    try {
      const ndk = await this.ensureConnected();
      const filter = {
        kinds: [0],
        authors: [pubkey],
        limit: 1
      };
      const event = await ndk.fetchEvent(filter);
      return event;
    } catch (error) {
      console.error('Error fetching profile event:', error);
      return null;
    }
  }

  createEventsFromData(pubkey: string, data: any) {
    const events = [];

    if (data.profile) {
      const ndkEvent = new NDKEvent();
      ndkEvent.kind = NDKKind.Metadata;

      // Create metadata object without identityTags
      const metadata = {
        name: data.profile.name,
        display_name: data.profile.displayName,
        about: data.profile.about,
        picture: data.profile.picture,
        banner: data.profile.banner,
        nip05: data.profile.nip05,
        lud16: data.profile.lud16,
        website: data.profile.website,
      };

      ndkEvent.content = JSON.stringify(metadata);
      ndkEvent.tags = []; // Initialize tags array

      // Add identity tags if present
      if (data.profile.identityTags) {
        data.profile.identityTags.forEach((link: any) => {
          if (link.platform && link.identity) {
            ndkEvent.tags.push(['i', `${link.platform}:${link.identity}`, link.proof]);
          }
        });
      }

      events.push(ndkEvent);
    }

    if (data.project) {

      const ndkEvent = new NDKEvent();
      ndkEvent.kind = NDKKind.AppSpecificData;
      ndkEvent.content = data.project.content;
      ndkEvent.tags = [['d', 'angor:project']],
      events.push(ndkEvent);

    }

    if (data.faq) {
      const faqContent = data.faq.map(({ question, answer }: FaqItem) => ({ 
        question, 
        answer 
      }));
      
      const ndkEvent = new NDKEvent();
      ndkEvent.kind = NDKKind.AppSpecificData;
      ndkEvent.content = JSON.stringify(faqContent);
      ndkEvent.tags = [['d', 'angor:faq']],
      events.push(ndkEvent);
      
    }

    if (data.members) {


      const ndkEvent = new NDKEvent();
      ndkEvent.kind = NDKKind.AppSpecificData;
      ndkEvent.content = JSON.stringify(data.members);
      ndkEvent.tags = [['d', 'angor:members']],
      events.push(ndkEvent);

    }

    if (data.media) {
      const ndkEvent = new NDKEvent();
      ndkEvent.kind = NDKKind.AppSpecificData;
      ndkEvent.content = JSON.stringify(data.media);
      ndkEvent.tags = [['d', 'angor:media']],
      events.push(ndkEvent);
    }

    return events;
  }

  private signEvent(event: any, privateKey: string) {
    const eventData = {
      ...event,
      id: '',
      sig: '',
    };

    // Generate event ID
    eventData.id = getEventHash(eventData);

    // Sign the event
    // eventData.sig = getSignature(eventData, privateKey);

    return eventData;
  }

  private async publishEvent(event: any) {
    try {
      const ndk = await this.ensureConnected();
      const ndkEvent = new NDKEvent(ndk, event);
      await ndkEvent.publish();
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  public disconnect() {
    if (this.ndk) {
      // this.ndk.close();
      this.isConnected = false;
    }
    this.pool.close(this.relayUrls);
  }

  // Add this helper method
   deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
