const { PrismaClient } = require('@prisma/client');

async function reassignAdmin() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findUnique({ where: { username: 'SYS-000001' } });
    const grandOmaxe = await prisma.community.findFirst({ where: { name: 'Grand Omaxe' } });
    
    if (admin && grandOmaxe) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { communityId: grandOmaxe.id }
      });
      console.log('SYS-000001 reassigned to Grand Omaxe.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
reassignAdmin();
