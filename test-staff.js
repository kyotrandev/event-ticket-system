
const login = async () => {
  const res = await fetch('http://localhost:4000/api/v1/auth/email/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@example.com', password: 'secret' })
  });
  const data = await res.json();
  return data.token;
};

const inviteStaff = async (token) => {
  const res = await fetch('http://localhost:4000/api/v1/events/7e0d2937-e8db-49b8-b4fa-f79b376c261c/staff/invite', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ email: 'newstaff_x123@example.com', firstName: 'NewTest', lastName: 'Staffer' })
  });
  console.log('Invite staff status:', res.status);
  const data = await res.json();
  console.log('Invite response:', data);
};

login().then(inviteStaff).catch(console.error);

