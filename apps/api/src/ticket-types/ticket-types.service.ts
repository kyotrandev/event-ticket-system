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

    const saleEnd = new Date(dto.saleEnd);
    const startTime = event.startTime;

    if (saleEnd >= startTime) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          saleEnd: 'saleEnd must be before event startTime',
        },
      });
    }

    return this.ticketTypeRepository.create({
      eventId,
      name: dto.name,
      price: dto.price,
      totalQty: dto.totalQty,
      soldQty: 0,
      reservedQty: 0,
      saleStart: new Date(dto.saleStart),
      saleEnd,
      status: TicketTypeStatusEnum.AVAILABLE,
    });
  }

  async findByEvent(eventId: string): Promise<TicketType[]> {
    return this.ticketTypeRepository.findByEvent(eventId);
  }

  async findById(id: string): Promise<NullableType<TicketType>> {
    return this.ticketTypeRepository.findById(id);
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

    const newTotalQty = dto.totalQty ?? ticketType.totalQty;
    const newSoldQty = ticketType.soldQty;

    // Auto-set SOLD_OUT if soldQty === totalQty
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

    return this.ticketTypeRepository.update(id, payload);
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
