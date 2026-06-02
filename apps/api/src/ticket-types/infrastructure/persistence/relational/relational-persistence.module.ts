import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTypeEntity } from './entities/ticket-type.entity';
import { TicketTypeRepository } from '../../../ticket-types.repository';
import { TicketTypesRelationalRepository } from './repositories/ticket-types.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TicketTypeEntity])],
  providers: [
    {
      provide: TicketTypeRepository,
      useClass: TicketTypesRelationalRepository,
    },
  ],
  exports: [TicketTypeRepository],
})
export class RelationalTicketTypePersistenceModule {}
