import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventStatusEnum } from '../../../../event-status.enum';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'event' })
export class EventEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String })
  organizerId: string;

  @Column({ type: String })
  name: string;

  @Column({ type: String, nullable: true })
  description: string | null;

  @Column({ type: String })
  location: string;

  @Column({ type: String })
  category: string;

  @Column('text', { array: true, nullable: true })
  tags: string[] | null;

  @Index()
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ type: String, nullable: true })
  bannerUrl: string | null;

  @Column({ type: 'int', default: 24 })
  cancellationWindowHours: number;

  @Column({ type: 'int', default: 6 })
  maxTicketsPerOrder: number;

  @Index()
  @Column({
    type: 'enum',
    enum: EventStatusEnum,
    default: EventStatusEnum.DRAFT,
  })
  status: EventStatusEnum;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @OneToMany('TicketTypeEntity', 'event')
  ticketTypes: any[];
}
