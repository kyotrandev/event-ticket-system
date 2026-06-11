import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from '../src/users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../src/roles/roles.enum';
import { StatusEnum } from '../src/statuses/statuses.enum';
import { BookingEntity } from '../src/bookings/infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../src/booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { TicketTypeEntity } from '../src/ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { TicketsService } from '../src/tickets/tickets.service';
import { BookingStatusEnum } from '../src/bookings/booking-status.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const ticketsService = app.get(TicketsService);

  const eventId = '7e0d2937-e8db-49b8-b4fa-f79b376c261c'; // Synthwave Nights 2026

  try {
    const ticketTypes = await dataSource.getRepository(TicketTypeEntity).find({
      where: { eventId }
    });

    if (ticketTypes.length === 0) {
      console.error('No ticket types found for event:', eventId);
      process.exit(1);
    }
    
    // Create 3 customers
    const customersData = [
      { email: 'customer_alpha@example.com', firstName: 'Alpha', lastName: 'Nguyen' },
      { email: 'customer_beta@example.com', firstName: 'Beta', lastName: 'Tran' },
      { email: 'customer_gamma@example.com', firstName: 'Gamma', lastName: 'Le' },
    ];

    console.log('Generating data...');
    
    await dataSource.transaction(async (manager) => {
      for (const data of customersData) {
        // Create user
        let user = await manager.findOne(UserEntity, { where: { email: data.email } });
        if (!user) {
          user = manager.create(UserEntity, {
            email: data.email,
            password: 'Password123!',
            firstName: data.firstName,
            lastName: data.lastName,
            roleId: RoleEnum.customer,
            statusId: StatusEnum.active,
          });
          await manager.save(user);
        }
        
        // Pick a random ticket type
        const tt = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];

        // Create booking
        const booking = manager.create(BookingEntity, {
          customerId: String(user.id),
          eventId: eventId,
          subtotalAmount: Number(tt.price) * 1,
          discountAmount: 0,
          totalAmount: Number(tt.price) * 1, // 1 ticket
          status: BookingStatusEnum.PAID,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        });
        await manager.save(booking);

        // Create booking item
        const item = manager.create(BookingItemEntity, {
          bookingId: booking.id,
          ticketTypeId: tt.id,
          quantity: 1,
          unitPrice: tt.price,
          subtotal: tt.price,
        });
        await manager.save(item);

        // Issue ticket
        await ticketsService.issueForBooking(booking, manager);
        
        console.log(`Generated 1 ticket for ${data.firstName} ${data.lastName} (${tt.name})`);
      }
    });

    console.log('Test data generation completed successfully!');
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
