import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import ms from 'ms';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { EventStaffAssignmentRelationalRepository } from './infrastructure/persistence/relational/repositories/event-staff-assignment.repository';
import { EventStaffAssignment } from './domain/event-staff-assignment';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { MailService } from '../mail/mail.service';
import { AllConfigType } from '../config/config.type';

export interface StaffWithUser extends EventStaffAssignment {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  statusId: number | null;
}

@Injectable()
export class EventStaffAssignmentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly repo: EventStaffAssignmentRelationalRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly mailService: MailService,
  ) {}

  private async loadEvent(eventId: string): Promise<EventEntity> {
    const event = await this.dataSource
      .getRepository(EventEntity)
      .findOne({ where: { id: eventId }, loadEagerRelations: false });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private assertOwner(
    event: EventEntity,
    requesterId: string,
    isAdmin: boolean,
  ) {
    if (!isAdmin && String(event.organizerId) !== requesterId) {
      throw new ForbiddenException('Not the event owner');
    }
  }

  async assign(
    eventId: string,
    staffId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<EventStaffAssignment> {
    const event = await this.loadEvent(eventId);
    this.assertOwner(event, requesterId, isAdmin);

    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({
      where: { id: Number(staffId) },
      loadEagerRelations: true,
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role?.id !== RoleEnum.staff) {
      throw new BadRequestException('User is not a Staff member.');
    }

    const existing = await this.repo.findOne(eventId, staffId);
    if (existing) {
      throw new ConflictException('Staff already assigned to this event.');
    }

    return this.repo.create({ eventId, staffId });
  }

  async remove(
    eventId: string,
    staffId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const event = await this.loadEvent(eventId);
    this.assertOwner(event, requesterId, isAdmin);
    await this.repo.remove(eventId, staffId);
  }

  async listByEvent(
    eventId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<StaffWithUser[]> {
    const event = await this.loadEvent(eventId);
    this.assertOwner(event, requesterId, isAdmin);

    const assignments = await this.repo.findByEvent(eventId);
    const staffIds = assignments.map((a) => Number(a.staffId));
    if (!staffIds.length) return [];

    const users = await this.dataSource
      .getRepository(UserEntity)
      .findByIds(staffIds);

    const userMap = new Map(users.map((u) => [String(u.id), u]));

    return assignments.map((a) => {
      const u = userMap.get(a.staffId);
      return {
        ...a,
        firstName: u?.firstName ?? null,
        lastName: u?.lastName ?? null,
        email: u?.email ?? null,
        statusId: u?.status?.id ?? null,
      };
    });
  }

  async listByStaff(staffId: string): Promise<any[]> {
    const assignments = await this.repo.findByStaff(staffId);
    if (!assignments.length) return [];

    const eventIds = assignments.map((a) => a.eventId);
    const events = await this.dataSource
      .getRepository(EventEntity)
      .findByIds(eventIds);

    const eventMap = new Map(events.map((e) => [e.id, e]));

    return assignments
      .map((a) => {
        const e = eventMap.get(a.eventId);
        return {
          ...a,
          event: e
            ? {
                id: e.id,
                name: e.name,
                location: e.location,
                startTime: e.startTime,
                endTime: e.endTime,
                bannerImage: e.bannerUrl,
              }
            : null,
        };
      })
      .filter((a) => a.event !== null);
  }

  async isAssigned(eventId: string, staffId: string): Promise<boolean> {
    const assignment = await this.repo.findOne(eventId, staffId);
    return assignment !== null;
  }

  async inviteStaff(
    eventId: string,
    email: string,
    firstName: string | undefined,
    lastName: string | undefined,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<EventStaffAssignment> {
    const event = await this.loadEvent(eventId);
    this.assertOwner(event, requesterId, isAdmin);

    const userRepo = this.dataSource.getRepository(UserEntity);
    let user = await userRepo.findOne({
      where: { email },
      loadEagerRelations: true,
    });

    if (user) {
      if (user.role?.id !== RoleEnum.staff) {
        throw new BadRequestException(
          'User with this email already exists and is not a Staff member.',
        );
      }
      const existing = await this.repo.findOne(eventId, String(user.id));
      if (existing) {
        throw new ConflictException('Staff is already assigned to this event.');
      }
      return this.repo.create({ eventId, staffId: String(user.id) });
    }

    // Create new staff user
    const randomPassword = randomBytes(16).toString('hex') + 'A1!';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    user = userRepo.create({
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      password: hashedPassword,
      provider: 'email',
      role: { id: RoleEnum.staff } as any,
      status: { id: StatusEnum.active } as any,
      isEmailVerified: false,
    });
    user = await userRepo.save(user);

    // Generate token and send email
    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      { forgotUserId: user.id },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn,
      },
    );

    // Get organizer info
    const organizer = await userRepo.findOne({
      where: { id: Number(requesterId) },
    });
    const organizerName = organizer?.firstName
      ? `${organizer.firstName} ${organizer.lastName || ''}`.trim()
      : organizer?.companyName || 'An Organizer';

    await this.mailService.staffInvitation({
      to: email,
      data: {
        hash,
        tokenExpires,
        eventName: event.name,
        organizerName,
      },
    });

    return this.repo.create({ eventId, staffId: String(user.id) });
  }
  async updateStaff(
    eventId: string,
    staffId: string,
    firstName: string | undefined,
    lastName: string | undefined,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<StaffWithUser> {
    const event = await this.loadEvent(eventId);
    this.assertOwner(event, requesterId, isAdmin);

    const isAssigned = await this.isAssigned(eventId, staffId);
    if (!isAssigned) {
      throw new BadRequestException(
        'Staff member is not assigned to this event.',
      );
    }

    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({
      where: { id: Number(staffId) },
      loadEagerRelations: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
    }

    await userRepo.save(user);

    const assignment = await this.repo.findOne(eventId, staffId);
    return {
      ...assignment!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      statusId: user.status?.id ?? null,
    };
  }
}
