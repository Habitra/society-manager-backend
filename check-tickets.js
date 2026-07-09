const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const adminCommunityId = 'eed51717-b19b-4416-957d-755ac85b7886'; // Platform

  const counts = await p.maintenanceTicket.groupBy({
    by: ['status'],
    where: { communityId: adminCommunityId, deletedAt: null },
    _count: { id: true },
  });
  console.log('Ticket counts for Platform community:', counts);
}

main().catch(console.error).finally(() => p.$disconnect());
