import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { BookingStatusEnum } from '../../../../booking-status.enum';

@Entity({
  name: 'booking',
})
export class BookingEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String })
  customerId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: BookingStatusEnum,
    default: BookingStatusEnum.PENDING_PAYMENT,
  })
  status: BookingStatusEnum;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'uuid', nullable: true })
  promoCodeId: string | null;

  // All amounts are integer VND (zero-decimal currency).
  @Column({ type: 'int' })
  subtotalAmount: number;

  @Column({ type: 'int', default: 0 })
  discountAmount: number;

  @Column({ type: 'int' })
  totalAmount: number;

  @OneToMany('BookingItemEntity', 'booking', { eager: true })
  items: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
