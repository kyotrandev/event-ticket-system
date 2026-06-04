import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { AuditLog } from '../../../../domain/audit-log';
import { AuditLogRepository } from '../../audit-log.repository';
import { AuditLogMapper } from '../mappers/audit-log.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class AuditLogRelationalRepository implements AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async create(data: AuditLog): Promise<AuditLog> {
    const persistenceModel = AuditLogMapper.toPersistence(data);
    const newEntity = await this.auditLogRepository.save(
      this.auditLogRepository.create(persistenceModel),
    );
    return AuditLogMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<AuditLog[]> {
    const entities = await this.auditLogRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => AuditLogMapper.toDomain(entity));
  }

  async findById(id: AuditLog['id']): Promise<NullableType<AuditLog>> {
    const entity = await this.auditLogRepository.findOne({
      where: { id },
    });

    return entity ? AuditLogMapper.toDomain(entity) : null;
  }
}
