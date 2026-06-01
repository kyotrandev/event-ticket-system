import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusEntity } from '../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { StatusEnum } from '../../../../statuses/statuses.enum';

@Injectable()
export class StatusSeedService {
  constructor(
    @InjectRepository(StatusEntity)
    private readonly repository: Repository<StatusEntity>,
  ) {}

  async run() {
    const statuses = [
      { id: StatusEnum.active, name: 'Active' },
      { id: StatusEnum.inactive, name: 'Inactive' },
      { id: StatusEnum.pending_approval, name: 'Pending Approval' },
      { id: StatusEnum.locked, name: 'Locked' },
    ];

    for (const status of statuses) {
      const exists = await this.repository.count({ where: { id: status.id } });
      if (!exists) {
        await this.repository.save(this.repository.create(status));
      }
    }
  }
}
