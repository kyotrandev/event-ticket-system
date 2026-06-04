import { Payment } from '../../../../domain/payment';
import { PaymentEntity } from '../entities/payment.entity';

export class PaymentMapper {
  static toDomain(raw: PaymentEntity): Payment {
    const domainEntity = new Payment();
    domainEntity.id = raw.id;
    domainEntity.bookingId = raw.bookingId;
    domainEntity.stripePaymentIntentId = raw.stripePaymentIntentId;
    domainEntity.amount = raw.amount;
    domainEntity.currency = raw.currency;
    domainEntity.status = raw.status;
    domainEntity.stripeRefundId = raw.stripeRefundId;
    domainEntity.refundedAt = raw.refundedAt;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Payment): PaymentEntity {
    const persistenceEntity = new PaymentEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.bookingId = domainEntity.bookingId;
    persistenceEntity.stripePaymentIntentId =
      domainEntity.stripePaymentIntentId;
    persistenceEntity.amount = domainEntity.amount;
    persistenceEntity.currency = domainEntity.currency;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.stripeRefundId = domainEntity.stripeRefundId;
    persistenceEntity.refundedAt = domainEntity.refundedAt;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
