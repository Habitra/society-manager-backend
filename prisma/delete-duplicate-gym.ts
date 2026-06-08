import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.amenity.deleteMany({
    where: { name: 'Community Gym', communityId: '319cfb06-44c1-4369-9b5a-fd3e83fa2ed4' }
  });
  console.log('Deleted duplicate Community Gym');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
