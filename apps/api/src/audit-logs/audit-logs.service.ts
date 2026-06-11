import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditLogRepository } from './infrastructure/persistence/audit-log.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { AuditLog } from './domain/audit-log';
import { AuditLogEntity } from './infrastructure/persistence/relational/entities/audit-log.entity';

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Append an audit entry. Pass a transaction manager to write atomically
   * with the business change (payments, booking status, revenue actions).
   * Outside a transaction, failures are logged but never break the flow.
   */
  async log(input: AuditLogInput, manager?: EntityManager): Promise<void> {
    const data = {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      payload: input.payload ?? null,
    };

    if (manager) {
      await manager.save(manager.create(AuditLogEntity, data));
      return;
    }

    try {
      await this.auditLogRepository.create(data);
    } catch (error) {
      this.logger.error(
        `audit write failed: ${input.action} ${input.entity}/${input.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.auditLogRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  async findPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: AuditLog[]; hasNextPage: boolean }> {
    const cappedLimit = Math.min(limit, 100);
    const rows = await this.findAllWithPagination({
      paginationOptions: { page, limit: cappedLimit + 1 },
    });
    const hasNextPage = rows.length > cappedLimit;
    const data = hasNextPage ? rows.slice(0, cappedLimit) : rows;
    return { data, hasNextPage };
  }

  findById(id: AuditLog['id']) {
    return this.auditLogRepository.findById(id);
  }
}
