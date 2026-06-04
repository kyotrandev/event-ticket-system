import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { PaymentStatusEnum } from '../../../../payment-status.enum';

@Entity({
  name: 'payment',
})
export class PaymentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  bookingId: string;

  // Idempotency key for webhook processing.
  @Index({ unique: true })
  @Column({ type: String })
  stripePaymentIntentId: string;

  // Integer VND (zero-decimal in Stripe: amount passes through unscaled).
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: String, default: 'vnd' })
  currency: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.PENDING,
  })
  status: PaymentStatusEnum;

  @Column({ type: String, nullable: true })
  stripeRefundId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
