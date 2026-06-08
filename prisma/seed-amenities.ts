import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'COMMUNITY_ADMIN' }, include: { community: true } });
  const community = admin?.community;
  
  if (!community) {
    console.log('No community admin found. Run the main seed first.');
    return;
  }

  const amenitiesData = [
    { name: 'Clubhouse', description: 'Main clubhouse for events and gatherings.', capacity: 100, autoApprove: false, bookingEnabled: true },
    { name: 'Gym', description: 'Fully equipped fitness center.', capacity: 20, autoApprove: true, bookingEnabled: true },
    { name: 'Swimming Pool', description: 'Olympic size swimming pool.', capacity: 30, autoApprove: true, bookingEnabled: true },
    { name: 'Community Hall', description: 'Large hall for events and parties.', capacity: 150, autoApprove: false, bookingEnabled: true },
    { name: 'Tennis Court', description: 'Outdoor tennis court.', capacity: 4, autoApprove: true, bookingEnabled: true },
    { name: 'Badminton Court', description: 'Indoor badminton court.', capacity: 4, autoApprove: true, bookingEnabled: true },
    { name: 'Rooftop Garden', description: 'Beautiful rooftop garden for relaxation.', capacity: 50, autoApprove: true, bookingEnabled: true },
  ];

  for (const data of amenitiesData) {
    await prisma.amenity.upsert({
      where: {
        communityId_name: {
          communityId: community.id,
          name: data.name,
        }
      },
      update: data,
      create: {
        ...data,
        communityId: community.id,
      }
    });
  }

  console.log('Amenities seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
