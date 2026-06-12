const axios = require('axios');
const { io } = require('socket.io-client');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:4000/api/v1';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  try {
    console.log('--- E2E NOTIFICATION TEST ---');

    // 1. Login Organizer
    const orgLogin = await axios.post(`${API_URL}/auth/email/login`, {
      email: 'organizer@example.com',
      password: 'secret',
    });
    const orgToken = orgLogin.data.token;
    console.log('Organizer logged in');

    // 2. Login Customer
    const cusLogin = await axios.post(`${API_URL}/auth/email/login`, {
      email: 'john.doe@example.com',
      password: 'secret',
    });
    const cusToken = cusLogin.data.token;
    console.log('Customer logged in');

    // 3. Connect Customer WebSocket
    const socket = io('http://localhost:4000', {
      auth: { token: `Bearer ${cusToken}` },
      transports: ['websocket'],
    });

    let notificationReceived = false;
    socket.on('connect', () => console.log('Customer WebSocket Connected'));
    socket.on('notification', (data) => {
      console.log('>>> RECEIVED REALTIME NOTIFICATION:', data);
      notificationReceived = true;
    });

    // Wait a bit for socket to connect
    await delay(1000);

    // 4. Create Event
    const eventRes = await axios.post(
      `${API_URL}/events`,
      {
        name: `Test Event ${Date.now()}`,
        location: 'Virtual',
        maxTicketsPerOrder: 5,
        category: 'other',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
      },
      { headers: { Authorization: `Bearer ${orgToken}` } }
    );
    const eventId = eventRes.data.id;
    console.log(`Event created: ${eventId}`);

    // 5. Create Ticket Type
    const ttRes = await axios.post(
      `${API_URL}/events/${eventId}/ticket-types`,
      {
        name: 'VIP',
        description: 'VIP Ticket',
        price: 0, // Free ticket so we can easily mock it
        totalQty: 100,
        saleStart: new Date(Date.now() - 86400000).toISOString(),
        saleEnd: new Date(Date.now() + 86000000).toISOString(),
      },
      { headers: { Authorization: `Bearer ${orgToken}` } }
    );
    const ttId = ttRes.data.id;
    console.log(`Ticket Type created: ${ttId}`);

    // 6. Publish Event
    await axios.patch(
      `${API_URL}/events/${eventId}/status`,
      { status: 'published' },
      { headers: { Authorization: `Bearer ${orgToken}` } }
    );
    console.log('Event published');

    // 7. Customer Books Ticket
    const bookRes = await axios.post(
      `${API_URL}/bookings`,
      {
        eventId,
        items: [{ ticketTypeId: ttId, quantity: 2 }],
      },
      { headers: { Authorization: `Bearer ${cusToken}` } }
    );
    const bookingId = bookRes.data.id;
    console.log(`Booking created: ${bookingId}`);

    // 8. Set Booking to PAID and free_ intent manually in DB so cancelEventBookings processes it
    console.log('Manually updating booking status in database to PAID...');
    const psqlCommand = `docker exec event-ticket-system-postgres-1 psql -U root -d event_ticket_db -c "UPDATE booking SET status = 'paid' WHERE id = '${bookingId}'; INSERT INTO payment (id, \\"bookingId\\", status, amount, \\"stripePaymentIntentId\\", \\"createdAt\\", \\"updatedAt\\") VALUES (gen_random_uuid(), '${bookingId}', 'succeeded', 0, 'free_${Date.now()}', now(), now());"`;
    execSync(psqlCommand);
    console.log('Booking marked as PAID with free_ intent');

    // 9. Organizer Cancels Event
    console.log('Organizer cancelling event...');
    await axios.patch(
      `${API_URL}/events/${eventId}/status`,
      { status: 'cancelled' },
      { headers: { Authorization: `Bearer ${orgToken}` } }
    );
    console.log('Event cancelled API called');

    // 10. Wait for Notification
    console.log('Waiting for realtime notification...');
    for (let i = 0; i < 10; i++) {
      if (notificationReceived) break;
      await delay(1000);
    }

    if (notificationReceived) {
      console.log('✅ TEST PASSED: Realtime notification successfully delivered.');
    } else {
      console.log('❌ TEST FAILED: Realtime notification was NOT delivered.');
    }

    // Disconnect
    socket.disconnect();
    process.exit(notificationReceived ? 0 : 1);
  } catch (err) {
    console.error('Test script error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTest();
