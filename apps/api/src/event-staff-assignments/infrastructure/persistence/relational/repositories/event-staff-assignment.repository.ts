import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventStaffAssignmentEntity } from '../entities/event-staff-assignment.entity';
import { EventStaffAssignment } from '../../../../domain/event-staff-assignment';
import { EventStaffAssignmentMapper } from '../mappers/event-staff-assignment.mapper';

@Injectable()
export class EventStaffAssignmentRelationalRepository {
  constructor(
    @InjectRepository(EventStaffAssignmentEntity)
    private readonly repo: Repository<EventStaffAssignmentEntity>,
  ) {}

  async create(
    data: Pick<EventStaffAssignment, 'eventId' | 'staffId'>,
  ): Promise<EventStaffAssignment> {
    const entity = this.repo.create({
      eventId: data.eventId,
      staffId: data.staffId,
    });
    return EventStaffAssignmentMapper.toDomain(await this.repo.save(entity));
  }

  async findByEvent(eventId: string): Promise<EventStaffAssignment[]> {
    const entities = await this.repo.find({ where: { eventId } });
    return entities.map(EventStaffAssignmentMapper.toDomain);
  }

  async findByStaff(staffId: string): Promise<EventStaffAssignment[]> {
    const entities = await this.repo.find({ where: { staffId } });
    return entities.map(EventStaffAssignmentMapper.toDomain);
  }

  async findOne(
    eventId: string,
    staffId: string,
  ): Promise<EventStaffAssignment | null> {
    const entity = await this.repo.findOne({
      where: { eventId, staffId },
    });
    return entity ? EventStaffAssignmentMapper.toDomain(entity) : null;
  }

  async remove(eventId: string, staffId: string): Promise<void> {
    await this.repo.delete({ eventId, staffId });
  }
}
