import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Security Guards seeding...');

  // 1. Resolve communityId dynamically from the active admin in the database
  const admin = await prisma.user.findFirst({
    where: {
      role: 'COMMUNITY_ADMIN',
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  if (!admin) {
    throw new Error('No active COMMUNITY_ADMIN user found to seed security guards for.');
  }

  const communityId = admin.communityId;
  console.log(`Resolved Community ID: ${communityId} from Admin: ${admin.email}`);

  // 2. Create Gate Assignments
  const gateNames = ['Main Gate', 'Service Gate', 'Tower Gate', 'Clubhouse Gate'];
  const gateCodes = ['MAIN', 'SERVICE', 'TOWER', 'CLUBHOUSE'];
  const gates = [];

  for (let i = 0; i < gateNames.length; i++) {
    let gate = await prisma.gateAssignment.findFirst({
      where: { communityId, code: gateCodes[i] },
    });

    if (!gate) {
      gate = await prisma.gateAssignment.create({
        data: {
          communityId,
          name: gateNames[i],
          code: gateCodes[i],
        },
      });
      console.log(`Created Gate: ${gate.name} (${gate.code})`);
    } else {
      console.log(`Existing Gate: ${gate.name} (${gate.code})`);
    }
    gates.push(gate);
  }

  // 3. Create 20 guards under StaffCategory.SECURITY_GUARD
  const guards = [];
  const passwordHash = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 20; i++) {
    const username = `guard_sec_${i}`;
    let guard = await prisma.user.findUnique({
      where: { username },
    });

    if (!guard) {
      guard = await prisma.user.create({
        data: {
          communityId,
          role: 'STAFF',
          status: 'ACTIVE',
          username,
          email: `guard_sec_${i}@example.com`,
          phone: `9888777${String(i).padStart(3, '0')}`,
          passwordHash,
          displayName: `Security Guard ${i}`,
          staffProfile: {
            create: {
              communityId,
              category: 'SECURITY_GUARD',
              employeeCode: `SG-${String(i).padStart(4, '0')}`,
              agencyName: i % 2 === 0 ? 'Sentinel Security Corp' : 'Vanguard Protection',
              joiningDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * i), // staggered joining
            },
          },
        },
      });
      console.log(`Created Guard: ${guard.displayName} (${guard.username})`);
    } else {
      console.log(`Existing Guard: ${guard.displayName} (${guard.username})`);
    }
    guards.push(guard);
  }

  // 4. Seed 100 attendance records (5 days of history for 20 guards)
  const today = new Date();
  let attendanceCount = 0;

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const date = new Date();
    date.setDate(today.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0); // start of day

    for (const guard of guards) {
      // Check if attendance already exists for this guard on this day
      const existing = await prisma.guardAttendance.findUnique({
        where: {
          communityId_guardId_date: {
            communityId,
            guardId: guard.id,
            date,
          },
        },
      });

      if (existing) continue;

      const isLate = Math.random() < 0.15;
      const isAbsent = Math.random() < 0.05;

      if (isAbsent) {
        await prisma.guardAttendance.create({
          data: {
            communityId,
            guardId: guard.id,
            date,
            status: 'ABSENT',
            isLate: false,
          },
        });
      } else {
        const checkIn = new Date(date);
        if (isLate) {
          checkIn.setHours(8, Math.floor(Math.random() * 20) + 6, 0, 0); // between 08:06 and 08:25
        } else {
          checkIn.setHours(7, Math.floor(Math.random() * 55) + 30, 0, 0); // between 07:30 and 07:55
        }

        const checkOut = new Date(date);
        checkOut.setHours(16, Math.floor(Math.random() * 30), 0, 0); // around 04:00 PM

        const diffMs = checkOut.getTime() - checkIn.getTime();
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        await prisma.guardAttendance.create({
          data: {
            communityId,
            guardId: guard.id,
            date,
            checkIn,
            checkOut,
            totalHours,
            isLate,
            status: isLate ? 'LATE' : 'PRESENT',
          },
        });
      }
      attendanceCount++;
    }
  }
  console.log(`Seeded ${attendanceCount} guard attendance records.`);

  // 5. Seed 20 incident records
  const incidentTypes = [
    'UNAUTHORIZED_ENTRY',
    'VENDOR_VIOLATION',
    'RESIDENT_COMPLAINT',
    'EMERGENCY',
    'SECURITY_BREACH',
  ];
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  let incidentCount = 0;

  for (let i = 0; i < 20; i++) {
    const guard = guards[i % guards.length];
    const incidentDate = new Date();
    incidentDate.setDate(incidentDate.getDate() - i);

    const existing = await prisma.guardIncident.findFirst({
      where: {
        communityId,
        guardId: guard.id,
        incidentDate,
      },
    });

    if (!existing) {
      await prisma.guardIncident.create({
        data: {
          communityId,
          guardId: guard.id,
          incidentType: incidentTypes[i % incidentTypes.length],
          severity: severities[i % severities.length],
          status: statuses[i % statuses.length],
          incidentDate,
          description: `Logged incident regarding ${incidentTypes[i % incidentTypes.length].toLowerCase().replace('_', ' ')} at ${gates[i % gates.length].name}. Staff responded promptly.`,
          resolutionNote: i % 2 === 0 ? 'Resolution verified by community administrator.' : null,
        },
      });
      incidentCount++;
    }
  }
  console.log(`Seeded ${incidentCount} guard incident records.`);

  // 6. Seed shift assignments (GuardShift)
  const shiftTypes = ['MORNING', 'EVENING', 'NIGHT'];
  const shiftTimings = {
    MORNING: { start: '06:00', end: '14:00' },
    EVENING: { start: '14:00', end: '22:00' },
    NIGHT: { start: '22:00', end: '06:00' },
  };
  let shiftCount = 0;

  for (let i = 0; i < guards.length; i++) {
    const guard = guards[i];
    const gate = gates[i % gates.length];
    const shiftType = shiftTypes[i % shiftTypes.length];
    const timings = shiftTimings[shiftType as keyof typeof shiftTimings];

    const existingShift = await prisma.guardShift.findFirst({
      where: {
        communityId,
        guardId: guard.id,
      },
    });

    if (!existingShift) {
      await prisma.guardShift.create({
        data: {
          communityId,
          guardId: guard.id,
          gateId: gate.id,
          shiftType,
          startTime: timings.start,
          endTime: timings.end,
          status: i % 10 === 0 ? 'BREAK' : 'ON_DUTY',
        },
      });
      shiftCount++;
    }
  }
  console.log(`Seeded ${shiftCount} active guard shifts.`);
  console.log('Security Guards seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
