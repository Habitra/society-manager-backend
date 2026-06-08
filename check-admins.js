const { PrismaClient } = require('@prisma/client');

async function checkAdmins() {
  const prisma = new PrismaClient();
  const admins = await prisma.user.findMany({
    where: { role: 'COMMUNITY_ADMIN' }
  });
  console.log('Admins found:', admins.map(a => a.email));
  await prisma.$disconnect();
}

checkAdmins();
