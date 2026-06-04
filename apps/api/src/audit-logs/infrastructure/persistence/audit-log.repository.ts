import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { AuditLog } from '../../domain/audit-log';

// Append-only: audit entries are never updated or removed.
export abstract class AuditLogRepository {
  abstract create(
    data: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<AuditLog>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<AuditLog[]>;

  abstract findById(id: AuditLog['id']): Promise<NullableType<AuditLog>>;
}
