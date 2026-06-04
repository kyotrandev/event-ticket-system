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
import { BookingEntity } from '../../../../../bookings/infrastructure/persistence/relational/entities/booking.entity';
import { TicketTypeEntity } from '../../../../../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';

@Entity({
  name: 'booking_item',
})
export class BookingItemEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => BookingEntity, (booking) => booking.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bookingId' })
  booking: BookingEntity;

  @Index()
  @Column({ type: 'uuid' })
  ticketTypeId: string;

  @ManyToOne(() => TicketTypeEntity, { eager: true })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketTypeEntity;

  @Column({ type: 'int' })
  quantity: number;

  // Price snapshot at booking time, integer VND.
  @Column({ type: 'int' })
  unitPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
