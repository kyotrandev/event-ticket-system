import { Module } from '@nestjs/common';
import { PromoCodeRepository } from '../promo-code.repository';
import { PromoCodeRelationalRepository } from './repositories/promo-code.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCodeEntity } from './entities/promo-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCodeEntity])],
  providers: [
    {
      provide: PromoCodeRepository,
      useClass: PromoCodeRelationalRepository,
    },
  ],
  exports: [PromoCodeRepository],
})
export class RelationalPromoCodePersistenceModule {}
