const { PrismaClient } = require('@prisma/client');

async function verifyIsolation() {
  const prisma = new PrismaClient();
  console.log("=== DB ISOLATION CHECK ===");
  try {
    const communities = await prisma.community.findMany();
    
    for (const comm of communities) {
      console.log(`\nCommunity A (${comm.name}):`);
      const resCount = await prisma.user.count({ where: { communityId: comm.id, role: 'RESIDENT' } });
      const unitCount = await prisma.unit.count({ where: { communityId: comm.id } });
      const towerCount = await prisma.tower.count({ where: { communityId: comm.id } });
      console.log(`- Residents: ${resCount}`);
      console.log(`- Units: ${unitCount}`);
      console.log(`- Towers: ${towerCount}`);
      
      const admins = await prisma.user.findMany({ where: { communityId: comm.id, role: 'COMMUNITY_ADMIN' } });
      console.log(`- Admins:`, admins.map(a => a.username));
    }
  } catch(e) {
    console.error("DB Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
verifyIsolation();
