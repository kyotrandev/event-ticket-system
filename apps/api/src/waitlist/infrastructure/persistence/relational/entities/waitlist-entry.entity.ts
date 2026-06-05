import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { WaitlistStatusEnum } from '../../../../waitlist-status.enum';

@Entity({ name: 'waitlist_entry' })
export class WaitlistEntryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String })
  userId: string;

  @Index()
  @Column({ type: 'uuid' })
  ticketTypeId: string;

  @Index()
  @Column({ type: 'uuid' })
  eventId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: WaitlistStatusEnum,
    default: WaitlistStatusEnum.WAITING,
  })
  status: WaitlistStatusEnum;

  @Column({ type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
