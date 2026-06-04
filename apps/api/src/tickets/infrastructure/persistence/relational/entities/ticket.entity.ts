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
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TicketStatusEnum } from '../../../../ticket-status.enum';
import { BookingItemEntity } from '../../../../../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';

@Entity({
  name: 'ticket',
})
export class TicketEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  bookingItemId: string;

  @ManyToOne(() => BookingItemEntity, { eager: true })
  @JoinColumn({ name: 'bookingItemId' })
  bookingItem: BookingItemEntity;

  // Denormalized for cheap check-in (Phase 4) and /tickets/me queries.
  @Index()
  @Column({ type: 'uuid' })
  eventId: string;

  @Index()
  @Column({ type: String })
  customerId: string;

  // Public ticket code (UUID v4) carried by the QR.
  @Index({ unique: true })
  @Column({ type: String })
  code: string;

  // HMAC-SHA256(code + eventId + TICKET_QR_SECRET)
  @Column({ type: String })
  qrSecret: string;

  @Index()
  @Column({
    type: 'enum',
    enum: TicketStatusEnum,
    default: TicketStatusEnum.ISSUED,
  })
  status: TicketStatusEnum;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
