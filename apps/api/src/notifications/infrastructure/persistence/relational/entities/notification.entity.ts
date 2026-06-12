import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({
  name: 'notification',
})
export class NotificationEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  relatedEntityId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
