import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventRepository } from './events.repository';
import { Event } from './domain/event';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { EventStatusEnum } from './event-status.enum';
import { NullableType } from '../utils/types/nullable.type';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  async create(organizerId: string, dto: CreateEventDto): Promise<Event> {
    const now = new Date();
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime <= now) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { startTime: 'startTime must be in the future' },
      });
    }

    if (endTime <= startTime) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { endTime: 'endTime must be after startTime' },
      });
    }

    return this.eventRepository.create({
      organizerId,
      name: dto.name,
      description: dto.description ?? null,
      location: dto.location,
      category: dto.category,
      tags: dto.tags ?? null,
      startTime,
      endTime,
      bannerUrl: dto.bannerUrl ?? null,
      cancellationWindowHours: dto.cancellationWindowHours ?? 24,
      maxTicketsPerOrder: dto.maxTicketsPerOrder ?? 6,
      status: EventStatusEnum.DRAFT,
    });
  }

  async findPublished(
    query: QueryEventDto,
  ): Promise<InfinityPaginationResponseDto<Event>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);

    const data = await this.eventRepository.findPublished({
      keyword: query.keyword,
      category: query.category,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      location: query.location,
      page,
      limit,
    });

    return infinityPagination(data, { page, limit });
  }

  async findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<InfinityPaginationResponseDto<Event>> {
    const safeLimit = Math.min(limit, 50);
    const data = await this.eventRepository.findByOrganizer(
      organizerId,
      page,
      safeLimit,
    );
    return infinityPagination(data, { page, limit: safeLimit });
  }

  async findById(id: string): Promise<NullableType<Event>> {
    return this.eventRepository.findById(id);
  }

  async update(
    id: string,
    organizerId: string,
    dto: UpdateEventDto,
    isAdmin: boolean,
  ): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (!isAdmin && String(event.organizerId) !== String(organizerId)) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied: you do not own this event',
      });
    }

    if (
      event.status === EventStatusEnum.CANCELLED ||
      event.status === EventStatusEnum.ENDED
    ) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Cannot update a cancelled or ended event',
      });
    }

    return this.eventRepository.update(id, dto);
  }

  async updateStatus(
    id: string,
    organizerId: string,
    dto: UpdateEventStatusDto,
    isAdmin: boolean,
  ): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (!isAdmin && String(event.organizerId) !== String(organizerId)) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied: you do not own this event',
      });
    }

    const currentStatus = event.status;
    const newStatus = dto.status;

    // Cannot change ENDED or CANCELLED
    if (
      currentStatus === EventStatusEnum.ENDED ||
      currentStatus === EventStatusEnum.CANCELLED
    ) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: `Cannot change status from ${currentStatus}`,
      });
    }

    // DRAFT → PUBLISHED: requires ≥1 TicketType
    if (
      currentStatus === EventStatusEnum.DRAFT &&
      newStatus === EventStatusEnum.PUBLISHED
    ) {
      const count = await this.eventRepository.countTicketTypesByEvent(id);
      if (count === 0) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            ticketTypes:
              'Cannot publish event without at least one ticket type',
          },
        });
      }
    }

    // Only allow valid transitions
    const validTransitions: Partial<
      Record<EventStatusEnum, EventStatusEnum[]>
    > = {
      [EventStatusEnum.DRAFT]: [EventStatusEnum.PUBLISHED],
      [EventStatusEnum.PUBLISHED]: [
        EventStatusEnum.ONGOING,
        EventStatusEnum.CANCELLED,
      ],
      [EventStatusEnum.ONGOING]: [
        EventStatusEnum.ENDED,
        EventStatusEnum.CANCELLED,
      ],
    };

    const allowed = validTransitions[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
      });
    }

    return this.eventRepository.updateStatus(id, newStatus);
  }

  async remove(
    id: string,
    organizerId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (!isAdmin && String(event.organizerId) !== String(organizerId)) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied: you do not own this event',
      });
    }

    if (event.status !== EventStatusEnum.DRAFT) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Only DRAFT events can be deleted',
      });
    }

    await this.eventRepository.remove(id);
  }
}
