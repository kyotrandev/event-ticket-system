import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketTypeStatusEnum } from '../../../../ticket-type-status.enum';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { EventEntity } from '../../../../../events/infrastructure/persistence/relational/entities/event.entity';

@Entity({ name: 'ticket_type' })
export class TicketTypeEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String })
  eventId: string;

  @ManyToOne(() => EventEntity, (event) => event.ticketTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;

  @Column({ type: String })
  name: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'int' })
  totalQty: number;

  @Column({ type: 'int', default: 0 })
  soldQty: number;

  @Column({ type: 'int', default: 0 })
  reservedQty: number;

  @Column({ type: 'timestamptz' })
  saleStart: Date;

  @Column({ type: 'timestamptz' })
  saleEnd: Date;

  @Column({
    type: 'enum',
    enum: TicketTypeStatusEnum,
    default: TicketTypeStatusEnum.AVAILABLE,
  })
  status: TicketTypeStatusEnum;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
