SELECT u.id, u.email, a."eventId" FROM "user" u LEFT JOIN event_staff_assignment a ON u.id::varchar = a."staffId" WHERE u.email = 'agent_staff_test@example.com';
