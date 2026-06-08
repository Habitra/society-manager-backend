const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function fixPassword() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.updateMany({
    where: { role: 'COMMUNITY_ADMIN' },
    data: { passwordHash }
  });
  console.log('Password fixed!');
  await prisma.$disconnect();
}

fixPassword();
