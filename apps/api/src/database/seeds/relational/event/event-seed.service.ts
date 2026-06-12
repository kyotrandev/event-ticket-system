import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoleEnum } from '../../../../roles/roles.enum';
import { EventStatusEnum } from '../../../../events/event-status.enum';
import { TicketTypeStatusEnum } from '../../../../ticket-types/ticket-type-status.enum';
import { EventEntity } from '../../../../events/infrastructure/persistence/relational/entities/event.entity';
import { TicketTypeEntity } from '../../../../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';

const DAY = 24 * 60 * 60 * 1000;

interface SeedTicketType {
  name: string;
  price: number;
  totalQty: number;
}

interface SeedEvent {
  name: string;
  description: string;
  location: string;
  category: string;
  tags: string[];
  startInDays: number;
  durationHours: number;
  bannerUrl: string;
  ticketTypes: SeedTicketType[];
}

const SAMPLE_EVENTS: SeedEvent[] = [
  {
    name: 'Synthwave Nights 2026',
    description:
      'An immersive electronic music night with live synth performances, neon visuals and guest DJs.',
    location: 'Saigon Exhibition Center, HCMC',
    category: 'Music',
    tags: ['music', 'electronic', 'nightlife'],
    startInDays: 14,
    durationHours: 5,
    bannerUrl:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
    ticketTypes: [
      { name: 'General Admission', price: 350000, totalQty: 500 },
      { name: 'VIP Pit', price: 850000, totalQty: 100 },
    ],
  },
  {
    name: 'DevConf HCMC: Scaling Systems',
    description:
      'A one-day developer conference on distributed systems, observability and platform engineering.',
    location: 'GEM Center, District 1, HCMC',
    category: 'Technology',
    tags: ['tech', 'conference', 'backend'],
    startInDays: 30,
    durationHours: 8,
    bannerUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    ticketTypes: [
      { name: 'Early Bird', price: 0, totalQty: 200 },
      { name: 'Standard', price: 500000, totalQty: 300 },
    ],
  },
  {
    name: 'Modern Art After Dark',
    description:
      'An evening gallery walk featuring contemporary local artists, with curator-led tours.',
    location: 'Fine Arts Museum, HCMC',
    category: 'Arts',
    tags: ['art', 'exhibition', 'culture'],
    startInDays: 7,
    durationHours: 3,
    bannerUrl:
      'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200&q=80',
    ticketTypes: [{ name: 'Entry', price: 150000, totalQty: 250 }],
  },
  {
    name: 'Saigon Marathon 2026',
    description:
      'The biggest city marathon spanning across multiple districts. Join thousands of runners!',
    location: 'District 7, HCMC',
    category: 'Sports',
    tags: ['sports', 'marathon', 'health'],
    startInDays: 45,
    durationHours: 6,
    bannerUrl:
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&q=80',
    ticketTypes: [
      { name: '5K Run', price: 250000, totalQty: 1000 },
      { name: '10K Run', price: 400000, totalQty: 800 },
      { name: 'Half Marathon', price: 600000, totalQty: 500 },
    ],
  },
  {
    name: 'Street Food Festival HCMC',
    description:
      'Taste the best street food from all regions of Vietnam in one massive outdoor festival.',
    location: 'Le Van Tam Park, District 1',
    category: 'Food & Drink',
    tags: ['food', 'festival', 'culture'],
    startInDays: 10,
    durationHours: 12,
    bannerUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
    ticketTypes: [
      { name: 'General Entry', price: 50000, totalQty: 2000 },
      { name: 'VIP Tasting Pass', price: 500000, totalQty: 200 },
    ],
  },
  {
    name: 'Asia Business Summit',
    description:
      'Networking and keynote speeches from top business leaders across Southeast Asia.',
    location: 'Landmark 81, HCMC',
    category: 'Business',
    tags: ['business', 'networking', 'leadership'],
    startInDays: 60,
    durationHours: 8,
    bannerUrl:
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80',
    ticketTypes: [
      { name: 'Standard Pass', price: 1500000, totalQty: 300 },
      { name: 'Executive Pass', price: 5000000, totalQty: 50 },
    ],
  },
  {
    name: 'Yoga Retreat Weekend',
    description:
      'A peaceful weekend of mindfulness, meditation, and guided yoga sessions by master instructors.',
    location: 'Thao Dien, District 2',
    category: 'Health & Wellness',
    tags: ['yoga', 'wellness', 'health'],
    startInDays: 20,
    durationHours: 48,
    bannerUrl:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
    ticketTypes: [
      { name: 'Day Pass', price: 800000, totalQty: 100 },
      { name: 'Weekend Pass', price: 1500000, totalQty: 50 },
    ],
  },
  {
    name: 'Stand-up Comedy Night: Local Legends',
    description:
      'Laugh out loud with the best local comedians performing their latest sets.',
    location: 'The Comedy Club, District 3',
    category: 'Comedy',
    tags: ['comedy', 'entertainment', 'nightout'],
    startInDays: 5,
    durationHours: 3,
    bannerUrl:
      'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200&q=80',
    ticketTypes: [
      { name: 'Standard Seat', price: 200000, totalQty: 150 },
      { name: 'Front Row', price: 400000, totalQty: 20 },
    ],
  },
  {
    name: 'Jazz in the City',
    description:
      'Smooth jazz, wine, and a beautiful skyline view from the rooftop.',
    location: 'Rooftop Lounge, District 1',
    category: 'Music',
    tags: ['jazz', 'music', 'live'],
    startInDays: 12,
    durationHours: 4,
    bannerUrl:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80',
    ticketTypes: [{ name: 'Entry + 1 Drink', price: 300000, totalQty: 100 }],
  },
  {
    name: 'Indie Game Developers Showcase',
    description:
      'Play the latest indie games and meet the developers behind them. VR experiences included!',
    location: 'SECC, District 7',
    category: 'Technology',
    tags: ['gaming', 'tech', 'indie'],
    startInDays: 25,
    durationHours: 10,
    bannerUrl:
      'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&q=80',
    ticketTypes: [
      { name: 'Visitor Pass', price: 150000, totalQty: 1000 },
      { name: 'VIP VR Pass', price: 500000, totalQty: 200 },
    ],
  },
];

@Injectable()
export class EventSeedService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypeRepository: Repository<TicketTypeEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async run() {
    const organizer = await this.userRepository.findOne({
      where: { role: { id: RoleEnum.organizer } },
    });
    if (!organizer) return;

    const now = Date.now();

    for (const sample of SAMPLE_EVENTS) {
      const existing = await this.eventRepository.findOne({
        where: { name: sample.name },
      });
      if (existing) continue;

      const startTime = new Date(now + sample.startInDays * DAY);
      const endTime = new Date(
        startTime.getTime() + sample.durationHours * 60 * 60 * 1000,
      );

      const event = await this.eventRepository.save(
        this.eventRepository.create({
          organizerId: String(organizer.id),
          name: sample.name,
          description: sample.description,
          location: sample.location,
          category: sample.category,
          tags: sample.tags,
          startTime,
          endTime,
          bannerUrl: sample.bannerUrl,
          status: EventStatusEnum.PUBLISHED,
        }),
      );

      for (const tt of sample.ticketTypes) {
        await this.ticketTypeRepository.save(
          this.ticketTypeRepository.create({
            eventId: event.id,
            name: tt.name,
            price: tt.price,
            totalQty: tt.totalQty,
            soldQty: 0,
            reservedQty: 0,
            // Sales open now and close when the event starts.
            saleStart: new Date(now),
            saleEnd: startTime,
            status: TicketTypeStatusEnum.AVAILABLE,
          }),
        );
      }
    }
  }
}
