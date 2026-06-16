import { PrismaClient, UserRole, UserStatus, OccupancyType, UnitType, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Resident Operations Data...');

  const community = await prisma.community.findFirst();
  if (!community) {
    console.error('No community found. Please run main seed first.');
    return;
  }

  const tower = await prisma.tower.findFirst({ where: { communityId: community.id } });
  if (!tower) {
    console.error('No tower found. Please run main seed first.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 20; i++) {
    const unitNumber = `A-${100 + i}`;
    
    // Create Unit if it doesn't exist
    const unit = await prisma.unit.upsert({
      where: { id: `seed-unit-${i}` }, // Using an arbitrary non-existing id, it will fail but fallback to create if we use first() or something. Let's just create it directly if it doesn't exist.
      update: {},
      create: {
        communityId: community.id,
        towerId: tower.id,
        unitNumber,
        type: UnitType.APARTMENT,
        occupancy: i % 2 === 0 ? 'TENANT' : 'OWNER',
      }
    });

    const username = `${community.code}-${10000 + i}`;
    const email = `resident${i}@example.com`;

    // Create User
    const user = await prisma.user.upsert({
      where: { communityId_email: { communityId: community.id, email } },
      update: {},
      create: {
        communityId: community.id,
        username,
        email,
        phone: `+9198000${10000 + i}`,
        passwordHash,
        displayName: `Resident ${i}`,
        role: UserRole.RESIDENT,
        status: i % 5 === 0 ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
        firstLoginCompleted: true,
        residentProfile: {
          create: {
            communityId: community.id,
            vehicleCount: 1,
            verificationStage: i % 5 === 0 ? 'PENDING' : 'APPROVED',
          }
        },
        residentAssignments: {
          create: {
            communityId: community.id,
            unitId: unit.id,
            occupancyType: i % 2 === 0 ? OccupancyType.TENANT : OccupancyType.OWNER_RESIDENT,
            isPrimary: true,
            moveInDate: new Date(),
          }
        }
      }
    });

    // Create Vehicle
    await prisma.vehicle.upsert({
      where: { vehicleNumber_deletedAt: { vehicleNumber: `MH-12-AB-${1000 + i}`, deletedAt: new Date(0) } }, // Fallback logic
      update: {},
      create: {
        communityId: community.id,
        userId: user.id,
        unitId: unit.id,
        vehicleNumber: `MH-12-AB-${1000 + i}`,
        type: VehicleType.FOUR_WHEELER,
        make: 'Honda',
        model: 'City',
        color: 'White',
        isVerified: true,
      }
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
