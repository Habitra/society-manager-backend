const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

async function verify() {
  console.log('=== Backend Integration Live Verification ===\n');

  try {
    const prisma = new PrismaClient();
    const admin = await prisma.user.findFirst({ where: { role: 'COMMUNITY_ADMIN' } });
    await prisma.$disconnect();

    console.log('Found Admin Username:', admin.username);

    // 1. Login
    console.log('Testing Login: POST /api/v1/auth/login');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: admin.username,
      password: 'password123'
    });
    console.log('Status:', loginRes.status);
    const token = loginRes.data.data.accessToken;
    console.log('Login Succeeded. Token Acquired.\n');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Dashboard Overview
    console.log('Testing Dashboard: GET /api/v1/dashboard/overview');
    const dashRes = await axios.get('http://localhost:3000/api/v1/dashboard/overview', { headers });
    console.log('Status:', dashRes.status);
    console.log('Sample Response:', JSON.stringify(dashRes.data.data).substring(0, 100), '...\n');

    // 3. Residents
    console.log('Testing Residents: GET /api/v1/residents');
    const resRes = await axios.get('http://localhost:3000/api/v1/residents', { headers });
    console.log('Status:', resRes.status);
    console.log('Sample Response:', JSON.stringify(resRes.data.data.items || resRes.data.data).substring(0, 100), '...\n');

    // 4. Visitors
    console.log('Testing Visitors: GET /api/v1/visitors');
    const visRes = await axios.get('http://localhost:3000/api/v1/visitors', { headers });
    console.log('Status:', visRes.status);
    console.log('Sample Response:', JSON.stringify(visRes.data.data.items || visRes.data.data).substring(0, 100), '...\n');

    // 5. Staff
    console.log('Testing Staff: GET /api/v1/staff');
    const staffRes = await axios.get('http://localhost:3000/api/v1/staff', { headers });
    console.log('Status:', staffRes.status);
    console.log('Sample Response:', JSON.stringify(staffRes.data.data.items || staffRes.data.data).substring(0, 100), '...\n');

    // 6. Billing
    console.log('Testing Billing: GET /api/v1/billing/dashboard/outstanding');
    const billRes = await axios.get('http://localhost:3000/api/v1/billing/dashboard/outstanding', { headers });
    console.log('Status:', billRes.status);
    console.log('Sample Response:', JSON.stringify(billRes.data.data).substring(0, 100), '...\n');

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

verify();
