import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'COMMUNITY_ADMIN' }});
  console.log('Admins:', users.map(u => ({ id: u.id, email: u.email, communityId: u.communityId })));
  
  const amenities = await prisma.amenity.findMany({ include: { community: true } });
  console.log('Total amenities:', amenities.length);
  amenities.forEach(a => console.log(`- ${a.name} (Community: ${a.community.name} / ${a.community.id})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
