import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { RelationalAuditLogPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

// Write-only audit trail for payment/booking/revenue actions.
// An admin read API arrives with Phase 6.
@Module({
  imports: [
    // do not remove this comment
    RelationalAuditLogPersistenceModule,
  ],
  providers: [AuditLogsService],
  exports: [AuditLogsService, RelationalAuditLogPersistenceModule],
})
export class AuditLogsModule {}
