const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const community = await prisma.community.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'COMMUNITY_ADMIN' } });
  console.log('COMMUNITY_ID_FOUND=' + community?.id);
  console.log('ADMIN_ID_FOUND=' + admin?.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
