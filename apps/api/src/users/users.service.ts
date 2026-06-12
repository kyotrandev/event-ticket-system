import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { User } from './domain/user';
import bcrypt from 'bcryptjs';
import { AuthProvidersEnum } from '../auth/auth-providers.enum';
import { FilesService } from '../files/files.service';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { SessionService } from '../session/session.service';
import { MailService } from '../mail/mail.service';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FileType } from '../files/domain/file';
import { Role } from '../roles/domain/role';
import { Status } from '../statuses/domain/status';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './infrastructure/persistence/relational/entities/user.entity';
import { UserMapper } from './infrastructure/persistence/relational/mappers/user.mapper';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Do not remove comment below.
    // <creating-property />

    let password: string | undefined = undefined;

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      password = await bcrypt.hash(createUserDto.password, salt);
    }

    let email: string | null = null;

    if (createUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        createUserDto.email,
      );
      if (userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
      email = createUserDto.email;
    }

    let photo: FileType | null | undefined = undefined;

    if (createUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        createUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (createUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (createUserDto.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(createUserDto.role.id));
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: createUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (createUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(createUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: createUserDto.status.id,
      };
    }

    return this.usersRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: email,
      password: password,
      photo: photo,
      role: role,
      status: status,
      provider: createUserDto.provider ?? AuthProvidersEnum.email,
      socialId: createUserDto.socialId,
      companyName: createUserDto.companyName ?? null,
      phoneNumber: createUserDto.phoneNumber ?? null,
      isEmailVerified: false,
    });
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.usersRepository.findById(id);
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.usersRepository.findBySocialIdAndProvider({
      socialId,
      provider,
    });
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    // Do not remove comment below.
    // <updating-property />

    let password: string | undefined = undefined;

    if (updateUserDto.password) {
      const userObject = await this.usersRepository.findById(id);

      if (userObject && userObject?.password !== updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        password = await bcrypt.hash(updateUserDto.password, salt);
      }
    }

    let email: string | null | undefined = undefined;

    if (updateUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );

      if (userObject && userObject.id !== id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }

      email = updateUserDto.email;
    } else if (updateUserDto.email === null) {
      email = null;
    }

    let photo: FileType | null | undefined = undefined;

    if (updateUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        updateUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (updateUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (updateUserDto.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(updateUserDto.role.id));
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: updateUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (updateUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(updateUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: updateUserDto.status.id,
      };
    }

    return this.usersRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      email,
      password,
      photo,
      role,
      status,
      provider: updateUserDto.provider,
      socialId: updateUserDto.socialId,
      isEmailVerified: updateUserDto.isEmailVerified,
      companyName: updateUserDto.companyName,
      phoneNumber: updateUserDto.phoneNumber,
    });
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.remove(id);
  }

  async approveOrganizer(id: User['id']): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (user.status?.id !== StatusEnum.pending_approval) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'User is not pending approval.',
      });
    }

    const updated = await this.usersRepository.update(id, {
      status: { id: StatusEnum.active },
    });

    try {
      await this.mailService.organizerApproved({
        to: user.email ?? '',
        data: { firstName: user.firstName ?? '' },
      });
    } catch (error) {
      console.error('Failed to send organizer approval email', error);
    }

    await this.notificationsService.create({
      userId: id as string,
      title: 'Account Approved',
      content:
        'Your organizer account has been approved by the admin. You can now start creating events.',
      type: 'ORGANIZER_APPROVED',
      relatedEntityId: id as string,
    });

    return updated!;
  }

  async rejectOrganizer(id: User['id']): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    if (user.status?.id !== StatusEnum.pending_approval) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        message: 'User is not pending approval.',
      });
    }

    const updated = await this.usersRepository.update(id, {
      status: { id: StatusEnum.locked },
    });

    try {
      await this.mailService.organizerRejected({
        to: user.email ?? '',
        data: { firstName: user.firstName ?? '' },
      });
    } catch (error) {
      console.error('Failed to send organizer rejection email', error);
    }

    await this.notificationsService.create({
      userId: id as string,
      title: 'Account Rejected',
      content:
        'Your organizer account has been rejected. Please contact support for more details.',
      type: 'ORGANIZER_REJECTED',
      relatedEntityId: id as string,
    });

    return updated!;
  }

  async lockUser(id: User['id']): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    const updated = await this.usersRepository.update(id, {
      status: { id: StatusEnum.locked },
    });

    await this.sessionService.deleteByUserId({ userId: id });

    return updated!;
  }

  async unlockUser(id: User['id']): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    const updated = await this.usersRepository.update(id, {
      status: { id: StatusEnum.active },
    });

    return updated!;
  }

  async findPendingOrganizers(
    paginationOptions: IPaginationOptions,
  ): Promise<User[]> {
    const entities = await this.dataSource.getRepository(UserEntity).find({
      where: {
        role: { id: RoleEnum.organizer },
        status: { id: StatusEnum.pending_approval },
      },
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => UserMapper.toDomain(e));
  }

  async findStaffUsers(): Promise<User[]> {
    const entities = await this.dataSource.getRepository(UserEntity).find({
      where: {
        role: { id: RoleEnum.staff },
        status: { id: StatusEnum.active },
      },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => UserMapper.toDomain(e));
  }
}
