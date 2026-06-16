import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const globalCount = await prisma.unit.count();
  console.log(`Global units count: ${globalCount}`);

  // get the first community
  const community = await prisma.community.findFirst();
  if (community) {
    const communityCount = await prisma.unit.count({
      where: { communityId: community.id }
    });
    console.log(`Units for community ${community.id} (${community.name}): ${communityCount}`);
  } else {
    console.log('No communities found.');
  }

  const towers = await prisma.tower.count();
  console.log(`Total towers: ${towers}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
