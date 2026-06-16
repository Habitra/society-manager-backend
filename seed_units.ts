import { PrismaClient, UnitType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Find communities that need seeding
  const communities = await prisma.community.findMany({
    include: { _count: { select: { units: true, towers: true } } }
  });

  for (const community of communities) {
    if (community._count.units === 0) {
      console.log(`Seeding units for community: ${community.id} (${community.name})`);

      // Create 3 Towers
      const towersToCreate = [
        { name: 'Tower A', floors: 5 },
        { name: 'Tower B', floors: 5 },
        { name: 'Tower C', floors: 5 },
      ];

      for (const towerData of towersToCreate) {
        const tower = await prisma.tower.create({
          data: {
            communityId: community.id,
            name: towerData.name,
            code: towerData.name.split(' ')[1],
            totalFloors: towerData.floors,
          }
        });
        console.log(`Created tower: ${tower.name}`);

        // Create 10 Units per Tower
        for (let i = 1; i <= 10; i++) {
          const floor = Math.ceil(i / 2); // 2 units per floor
          const unitNumber = `${tower.name.split(' ')[1]}-${floor}0${i % 2 === 0 ? 2 : 1}`;
          
          await prisma.unit.create({
            data: {
              communityId: community.id,
              towerId: tower.id,
              unitNumber: unitNumber,
              type: UnitType.APARTMENT,
              floor: floor,
              areaSqFt: 1200,
            }
          });
        }
        console.log(`Created 10 units for ${tower.name}`);
      }
      
      console.log(`Finished seeding community: ${community.name}`);
    } else {
      console.log(`Community ${community.name} already has ${community._count.units} units. Skipping.`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
