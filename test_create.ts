// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'COMMUNITY_ADMIN' }
  });

  const unit = await prisma.unit.findFirst({
    where: { communityId: admin.communityId }
  });

  // Force password
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: hash }
  });

  console.log('Forced password for:', admin.email);

  // Authenticate to get token
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: admin.username, password: 'password123' })
  });
  const loginData = await loginRes.json();
  console.log('Login response:', loginData);
  const token = loginData?.data?.accessToken;

  console.log('Got token:', !!token);

  // Send request
  const reqBody = {
    fullName: "Test User",
    email: "test@test.com",
    phone: "1234567890",
    emergencyContactName: "Emergency Name",
    emergencyContactNumber: "0987654321",
    emergencyContactRelation: "Friend",
    unitId: unit.id,
    occupancyType: "OWNER_RESIDENT",
    isPrimaryResident: false
  };

  const createRes = await fetch('http://localhost:3000/api/v1/residents', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(reqBody)
  });

  const status = createRes.status;
  const createData = await createRes.json();

  console.log('Status:', status);
  console.log('Response:', JSON.stringify(createData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
