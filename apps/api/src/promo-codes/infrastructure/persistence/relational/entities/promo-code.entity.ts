import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { PromoCodeDiscountTypeEnum } from '../../../../promo-code-discount-type.enum';

@Entity({
  name: 'promo_code',
})
export class PromoCodeEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: String })
  code: string;

  @Column({
    type: 'enum',
    enum: PromoCodeDiscountTypeEnum,
  })
  discountType: PromoCodeDiscountTypeEnum;

  // PERCENT: 0-100; FIXED: amount in VND.
  @Column({ type: 'int' })
  discountValue: number;

  @Column({ type: 'int' })
  maxUses: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamptz' })
  validFrom: Date;

  @Column({ type: 'timestamptz' })
  validTo: Date;

  @Column({ type: Boolean, default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
