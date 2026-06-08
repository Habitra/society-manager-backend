const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding security data...');

  const communityId = 'eed51717-b19b-4416-957d-755ac85b7886'; // SYS-000001
  const userId = '5bbe0d24-4014-4d27-af42-6ab30d6794b2'; // Admin user

  // Create guards
  const guards = [];
  for (let i = 0; i < 5; i++) {
    const user = await prisma.user.create({
      data: {
        communityId,
        role: 'GUARD',
        status: 'ACTIVE',
        username: `guard_${i}`,
        email: `guard_${i}@example.com`,
        phone: `980000000${i}`,
        passwordHash: 'dummy',
        displayName: `Security Guard ${i}`,
        staffProfile: {
          create: {
            communityId,
            category: 'SECURITY_GUARD',
          }
        }
      }
    });
    guards.push(user);
  }

  const units = await prisma.unit.findMany({ where: { communityId }, take: 10 });
  if (units.length === 0) return;

  const now = new Date();

  // Create Visitors
  for (let i = 0; i < 20; i++) {
    const entryTime = new Date(now.getTime() - Math.random() * 86400000 * 2); // past 48h
    const outTime = Math.random() > 0.2 ? new Date(entryTime.getTime() + Math.random() * 3600000 * 4) : null;
    
    const req = await prisma.visitorRequest.create({
      data: {
        communityId,
        requestedById: userId,
        unitId: units[i % units.length].id,
        visitorName: `Guest ${i}`,
        visitorPhone: `99999999${i % 10}`,
        visitorType: 'GUEST',
        entryMode: 'ON_ARRIVAL',
        status: outTime ? 'EXITED' : 'ENTERED',
        validFrom: entryTime,
        gateEntries: {
          create: {
            communityId,
            guardId: guards[i % guards.length].id,
            visitorName: `Guest ${i}`,
            inTime: entryTime,
            outTime: outTime,
          }
        }
      }
    });
  }

  // Create Deliveries
  for (let i = 0; i < 20; i++) {
    const entryTime = new Date(now.getTime() - Math.random() * 86400000); // past 24h
    const outTime = Math.random() > 0.1 ? new Date(entryTime.getTime() + Math.random() * 600000) : null;
    
    await prisma.visitorRequest.create({
      data: {
        communityId,
        requestedById: userId,
        unitId: units[i % units.length].id,
        visitorName: i % 2 === 0 ? 'Amazon Delivery' : 'Swiggy Delivery',
        visitorType: 'DELIVERY',
        entryMode: 'ON_ARRIVAL',
        status: outTime ? 'EXITED' : 'ENTERED',
        validFrom: entryTime,
        gateEntries: {
          create: {
            communityId,
            guardId: guards[i % guards.length].id,
            visitorName: i % 2 === 0 ? 'Amazon Delivery' : 'Swiggy Delivery',
            inTime: entryTime,
            outTime: outTime,
          }
        }
      }
    });
  }

  // Create Vendors
  for (let i = 0; i < 10; i++) {
    const entryTime = new Date(now.getTime() - Math.random() * 86400000 * 3); // past 72h
    const outTime = Math.random() > 0.3 ? new Date(entryTime.getTime() + Math.random() * 3600000 * 8) : null; // some stay 8h, some missing outTime
    
    await prisma.visitorRequest.create({
      data: {
        communityId,
        requestedById: userId,
        unitId: units[i % units.length].id,
        visitorName: `Vendor ${i}`,
        visitorType: 'VENDOR',
        entryMode: 'PRE_APPROVED',
        status: outTime ? 'EXITED' : 'ENTERED',
        validFrom: entryTime,
        gateEntries: {
          create: {
            communityId,
            guardId: guards[i % guards.length].id,
            visitorName: `Vendor ${i}`,
            inTime: entryTime,
            outTime: outTime,
          }
        }
      }
    });
  }

  // Create Vehicles
  for (let i = 0; i < 5; i++) {
    const entryTime = new Date(now.getTime() - Math.random() * 86400000);
    await prisma.gateEntry.create({
      data: {
        communityId,
        guardId: guards[i % guards.length].id,
        visitorName: 'Unknown Resident',
        vehicleNumber: `MH12AB100${i}`,
        isVehicleEntry: true,
        inTime: entryTime,
      }
    });
  }

  // Create Watchlists
  await prisma.securityWatchlist.create({
    data: {
      communityId,
      entityType: 'VEHICLE_NUMBER',
      entityValue: 'MH12AB1234',
      level: 'RESTRICTED',
      reason: 'Frequent noise complaints',
      addedById: userId,
    }
  });

  await prisma.securityWatchlist.create({
    data: {
      communityId,
      entityType: 'VISITOR_PHONE',
      entityValue: '9999999999',
      level: 'BLACKLISTED',
      reason: 'Abusive to guards',
      addedById: userId,
    }
  });

  console.log('Security data seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
