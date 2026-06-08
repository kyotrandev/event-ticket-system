import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TicketTypeRepository } from './ticket-types.repository';
import { EventsService } from '../events/events.service';
import { TicketType } from './domain/ticket-type';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { TicketTypeStatusEnum } from './ticket-type-status.enum';
import { NullableType } from '../utils/types/nullable.type';

function computeEffectiveStatus(
  tt: TicketType,
  now: Date,
): TicketTypeStatusEnum {
  if (tt.soldQty >= tt.totalQty) return TicketTypeStatusEnum.SOLD_OUT;
  if (tt.status === TicketTypeStatusEnum.SOLD_OUT)
    return TicketTypeStatusEnum.SOLD_OUT;
  if (tt.saleStart > now) return TicketTypeStatusEnum.UPCOMING;
  if (tt.saleEnd < now) return TicketTypeStatusEnum.CLOSED;
  return tt.status === TicketTypeStatusEnum.CLOSED
    ? TicketTypeStatusEnum.CLOSED
    : TicketTypeStatusEnum.AVAILABLE;
}

@Injectable()
export class TicketTypesService {
  constructor(
    private readonly ticketTypeRepository: TicketTypeRepository,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    eventId: string,
    organizerId: string,
    dto: CreateTicketTypeDto,
  ): Promise<TicketType> {
    const event = await this.eventsService.findById(eventId);
    if (!event) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (String(event.organizerId) !== String(organizerId)) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied: you do not own this event',
      });
    }

    const saleStart = new Date(dto.saleStart);
    const saleEnd = new Date(dto.saleEnd);
    const startTime = event.startTime;

    if (saleStart >= saleEnd) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { saleStart: 'saleStart must be before saleEnd' },
      });
    }

    if (saleEnd > event.endTime) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          saleEnd: 'saleEnd must be before or equal to event endTime',
        },
      });
    }

    const tt = await this.ticketTypeRepository.create({
      eventId,
      name: dto.name,
      price: dto.price,
      totalQty: dto.totalQty,
      soldQty: 0,
      reservedQty: 0,
      saleStart,
      saleEnd,
      status: TicketTypeStatusEnum.AVAILABLE,
    });
    tt.status = computeEffectiveStatus(tt, new Date());
    return tt;
  }

  async findByEvent(eventId: string): Promise<TicketType[]> {
    const now = new Date();
    const types = await this.ticketTypeRepository.findByEvent(eventId);
    return types.map((tt) => {
      tt.status = computeEffectiveStatus(tt, now);
      return tt;
    });
  }

  async findById(id: string): Promise<NullableType<TicketType>> {
    const tt = await this.ticketTypeRepository.findById(id);
    if (tt) tt.status = computeEffectiveStatus(tt, new Date());
    return tt;
  }

  async update(
    id: string,
    eventId: string,
    organizerId: string,
    dto: UpdateTicketTypeDto,
  ): Promise<TicketType> {
    const ticketType = await this.ticketTypeRepository.findById(id);
    if (!ticketType) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }
    // If eventId is provided, validate it matches; otherwise use ticketType's eventId
    const resolvedEventId = eventId || ticketType.eventId;
    if (eventId && ticketType.eventId !== eventId) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    const event = await this.eventsService.findById(resolvedEventId);
    if (!event) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (String(event.organizerId) !== String(organizerId)) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied: you do not own this event',
      });
    }

    // Validate totalQty reduction
    if (dto.totalQty !== undefined && dto.totalQty < ticketType.soldQty) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          totalQty: 'totalQty cannot be less than soldQty',
        },
      });
    }

    // Validate saleStart < saleEnd using merged values
    const resolvedSaleStart = dto.saleStart
      ? new Date(dto.saleStart)
      : ticketType.saleStart;
    const resolvedSaleEnd = dto.saleEnd
      ? new Date(dto.saleEnd)
      : ticketType.saleEnd;
    if (resolvedSaleStart >= resolvedSaleEnd) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { saleStart: 'saleStart must be before saleEnd' },
      });
    }

    const newTotalQty = dto.totalQty ?? ticketType.totalQty;
    const newSoldQty = ticketType.soldQty;

    // Store AVAILABLE or SOLD_OUT; effective status computed at read time
    let newStatus = ticketType.status;
    if (newSoldQty >= newTotalQty) {
      newStatus = TicketTypeStatusEnum.SOLD_OUT;
    } else if (ticketType.status === TicketTypeStatusEnum.SOLD_OUT) {
      newStatus = TicketTypeStatusEnum.AVAILABLE;
    }

    const payload: Partial<TicketType> = {
      ...dto,
      saleStart: dto.saleStart ? new Date(dto.saleStart) : undefined,
      saleEnd: dto.saleEnd ? new Date(dto.saleEnd) : undefined,
      status: newStatus,
    };

    const updated = await this.ticketTypeRepository.update(id, payload);
    updated.status = computeEffectiveStatus(updated, new Date());
    return updated;
  }

  async remove(
    id: string,
    eventId: string,
    organizerId: string,
  ): Promise<void> {
    const ticketType = await this.ticketTypeRepository.findById(id);
    if (!ticketType) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }
    if (eventId && ticketType.eventId !== eventId) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }
    const resolvedEventId = eventId || ticketType.eventId;

    const event = await this.eventsService.findById(resolvedEventId);
    if (!event) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (String(event.organizerId) !== String(organizerId)) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied: you do not own this event',
      });
    }

    if (ticketType.soldQty > 0) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Cannot delete ticket type with sold tickets',
      });
    }

    await this.ticketTypeRepository.remove(id);
  }

  async countByEvent(eventId: string): Promise<number> {
    return this.ticketTypeRepository.countByEvent(eventId);
  }
}
