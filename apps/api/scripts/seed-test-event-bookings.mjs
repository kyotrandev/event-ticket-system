/**
 * Seed paid bookings + tickets for Test Event (testorganizer@gmail.com).
 * Run: cd apps/api && node scripts/seed-test-event-bookings.mjs
 */
import 'dotenv/config';
import Stripe from 'stripe';

const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ?? 'http://localhost:4000/api/payments/webhook';
const EVENT_ID = 'f30ad713-6cfa-47d3-a3e9-d26662fbb6b8';
const TICKET_TYPE_ID = 'f8272957-d10f-444f-a9ce-50ff3cf2f75b';
const TEST_ORGANIZER_ID = '12';
const TEST_ORGANIZER_EMAIL = 'testorganizer@gmail.com';
const TEST_ORGANIZER_PASSWORD = 'Secret123';

const CUSTOMERS = [
  { email: 'customer_alpha@example.com', password: 'secret', id: '9' },
  { email: 'customer_beta@example.com', password: 'secret', id: '10' },
  { email: 'customer_gamma@example.com', password: 'secret', id: '11' },
];

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function login(email, password) {
  const data = await api('/auth/email/login', {
    method: 'POST',
    body: { email, password },
  });
  return data.token;
}

async function adminPrep(adminToken) {
  console.log(`→ Admin: reset password for ${TEST_ORGANIZER_EMAIL}`);
  await api(`/users/${TEST_ORGANIZER_ID}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      password: TEST_ORGANIZER_PASSWORD,
      status: { id: 1 },
      isEmailVerified: true,
    },
  });

  const orgToken = await login(TEST_ORGANIZER_EMAIL, TEST_ORGANIZER_PASSWORD);
  console.log('→ Organizer: bump ticket inventory to 5');
  await api(`/ticket-types/${TICKET_TYPE_ID}`, {
    method: 'PATCH',
    token: orgToken,
    body: { totalQty: 5 },
  });

  for (const c of CUSTOMERS) {
    console.log(`→ Admin: activate ${c.email}`);
    await api(`/users/${c.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        role: { id: 2 },
        status: { id: 1 },
        isEmailVerified: true,
        password: c.password,
      },
    });
  }
}

async function createAndPayBooking(token, stripe, webhookSecret) {
  const booking = await api('/bookings', {
    method: 'POST',
    token,
    body: { items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }] },
  });

  const intentRes = await api(`/payments/intent/${booking.id}`, {
    method: 'POST',
    token,
  });

  if (intentRes.status === 'paid') {
    return { bookingId: booking.id, status: 'paid (free)' };
  }

  const clientSecret = intentRes.clientSecret;
  if (!clientSecret) {
    throw new Error('No clientSecret returned');
  }

  const piId = clientSecret.split('_secret_')[0];

  await stripe.paymentIntents.confirm(piId, {
    payment_method: 'pm_card_visa',
    return_url: 'http://localhost:3000/my-bookings',
  });

  const pi = await stripe.paymentIntents.retrieve(piId);
  const eventPayload = {
    id: `evt_seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        metadata: pi.metadata,
      },
    },
  };

  const payload = JSON.stringify(eventPayload);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const whRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  });

  if (!whRes.ok) {
    const err = await whRes.text();
    throw new Error(`Webhook failed ${whRes.status}: ${err}`);
  }

  return { bookingId: booking.id, paymentIntent: piId, amount: pi.amount };
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET required in .env');
  }

  const stripe = new Stripe(secretKey);
  const adminToken = await login('admin@example.com', 'secret');
  await adminPrep(adminToken);

  const results = [];
  for (const c of CUSTOMERS) {
    console.log(`\n→ Customer ${c.email}`);
    const token = await login(c.email, c.password);
    const result = await createAndPayBooking(token, stripe, webhookSecret);
    results.push({ customer: c.email, ...result });
    console.log('  ✓', result);
  }

  console.log('\n=== Done ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('\nOrganizer login:', TEST_ORGANIZER_EMAIL, '/', TEST_ORGANIZER_PASSWORD);
  console.log('Xem: http://localhost:3000/organizer/bookings');
  console.log('     http://localhost:3000/organizer/tickets');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
