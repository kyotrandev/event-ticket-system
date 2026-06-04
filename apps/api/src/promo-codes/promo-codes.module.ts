import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { PromoCodesController } from './promo-codes.controller';
import { RelationalPromoCodePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalPromoCodePersistenceModule,
  ],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService, RelationalPromoCodePersistenceModule],
})
export class PromoCodesModule {}
