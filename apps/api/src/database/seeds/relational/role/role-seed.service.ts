import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  async run() {
    const roles = [
      { id: RoleEnum.admin, name: 'Admin' },
      { id: RoleEnum.customer, name: 'Customer' },
      { id: RoleEnum.organizer, name: 'Organizer' },
      { id: RoleEnum.staff, name: 'Staff' },
    ];

    for (const role of roles) {
      const exists = await this.repository.count({ where: { id: role.id } });
      if (!exists) {
        await this.repository.save(this.repository.create(role));
      }
    }
  }
}
