const { PrismaClient } = require('@prisma/client');

const endpoints = [
  '/api/v1/vendors/dashboard',
  '/api/v1/vendors',
  '/api/v1/vendors/contracts',
  '/api/v1/vendors/work-orders',
  '/api/v1/vendors/compliance',
  '/api/v1/vendors/performance',
  '/api/v1/vendors/analytics',
  '/api/v1/vendors/audit'
];

async function verify() {
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({ where: { role: 'COMMUNITY_ADMIN' } });
  await prisma.$disconnect();

  if (!admin) {
    console.error('No COMMUNITY_ADMIN found in database!');
    return;
  }

  console.log('Logging in as:', admin.username);
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: admin.username,
      password: 'password123'
    })
  });

  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    return;
  }

  const token = loginData.data.accessToken;
  console.log('Login Succeeded. Token Acquired.');

  for (const endpoint of endpoints) {
    console.log(`\n=== GET ${endpoint} ===`);
    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Status: ${res.status}`);
      const data = await res.json();
      console.log(JSON.stringify(data).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : ''));
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

verify();
