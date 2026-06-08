const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { role: 'COMMUNITY_ADMIN' } })
  .then(admin => {
    if (admin) {
      console.log('Found Admin:', admin.email);
    } else {
      console.log('No Admin found!');
    }
  })
  .finally(() => prisma.$disconnect());
