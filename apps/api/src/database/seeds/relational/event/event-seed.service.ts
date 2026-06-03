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
    const count = await this.eventRepository.count();
    if (count) return;

    const organizer = await this.userRepository.findOne({
      where: { role: { id: RoleEnum.organizer } },
    });
    if (!organizer) return;

    const now = Date.now();

    for (const sample of SAMPLE_EVENTS) {
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
