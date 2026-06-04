import { Module } from '@nestjs/common';
import { TicketRepository } from '../ticket.repository';
import { TicketRelationalRepository } from './repositories/ticket.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketEntity])],
  providers: [
    {
      provide: TicketRepository,
      useClass: TicketRelationalRepository,
    },
  ],
  exports: [TicketRepository],
})
export class RelationalTicketPersistenceModule {}
