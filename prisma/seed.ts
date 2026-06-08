import { PrismaClient, UserRole, UserStatus, UnitOccupancyType, VisitorType, VisitorEntryMode, TicketPriority, InvoiceCycleFrequency } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Community
  const community = await prisma.community.create({
    data: {
      name: 'Grand Omaxe',
      slug: 'grand-omaxe',
      code: 'GOX',
      type: 'APARTMENT_COMPLEX',
      status: 'ACTIVE',
      contactEmail: 'admin@grandomaxe.com',
      contactPhone: '9876543210',
      address: { city: 'Noida', state: 'UP' },
      totalUnits: 30,
    },
  });

  console.log(`Created Community: ${community.name}`);

  // 2. Towers (3)
  const towers = await Promise.all([
    prisma.tower.create({ data: { communityId: community.id, name: 'Tower A', code: 'A', totalFloors: 10, totalUnits: 10 } }),
    prisma.tower.create({ data: { communityId: community.id, name: 'Tower B', code: 'B', totalFloors: 10, totalUnits: 10 } }),
    prisma.tower.create({ data: { communityId: community.id, name: 'Tower C', code: 'C', totalFloors: 10, totalUnits: 10 } }),
  ]);

  console.log('Created 3 Towers');

  // 3. Units (30)
  const units = [];
  for (let i = 0; i < 30; i++) {
    const tower = towers[i % 3];
    const unit = await prisma.unit.create({
      data: {
        communityId: community.id,
        towerId: tower.id,
        unitNumber: `${tower.code}-${101 + Math.floor(i / 3)}`,
        floor: Math.floor(i / 3) + 1,
        occupancy: i < 20 ? 'OWNER' : (i < 25 ? 'TENANT' : 'VACANT'),
      },
    });
    units.push(unit);
  }

  console.log('Created 30 Units');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 4. Residents (15 Owners, 5 Tenants)
  const users = [];
  for (let i = 0; i < 20; i++) {
    const isOwner = i < 15;
    const user = await prisma.user.create({
      data: {
        communityId: community.id,
        role: 'RESIDENT',
        status: 'ACTIVE',
        username: `RES-${String(i + 1).padStart(4, '0')}`,
        email: `resident${i + 1}@example.com`,
        phone: `99999999${String(i).padStart(2, '0')}`,
        passwordHash,
        displayName: `Resident ${i + 1}`,
        residentProfile: {
          create: { communityId: community.id },
        },
      },
    });
    users.push(user);

    await prisma.residentUnitAssignment.create({
      data: {
        communityId: community.id,
        userId: user.id,
        unitId: units[i].id,
        occupancyType: isOwner ? 'OWNER_RESIDENT' : 'TENANT',
        isPrimary: true,
      },
    });
  }

  console.log('Created 15 Owners and 5 Tenants');

  // 5. Staff (3 Guards, 3 Staff)
  const staffIds = [];
  for (let i = 0; i < 6; i++) {
    const isGuard = i < 3;
    const user = await prisma.user.create({
      data: {
        communityId: community.id,
        role: isGuard ? 'GUARD' : 'STAFF',
        status: 'ACTIVE',
        username: `STF-${String(i + 1).padStart(4, '0')}`,
        email: `staff${i + 1}@example.com`,
        phone: `88888888${String(i).padStart(2, '0')}`,
        passwordHash,
        displayName: isGuard ? `Guard ${i + 1}` : `Staff ${i + 1}`,
        staffProfile: {
          create: {
            communityId: community.id,
            category: isGuard ? 'SECURITY_GUARD' : (i % 2 === 0 ? 'PLUMBER' : 'ELECTRICIAN'),
          },
        },
      },
    });
    staffIds.push(user.id);
  }

  console.log('Created 3 Guards and 3 Staff');

  // 6. Visitors (20)
  for (let i = 0; i < 20; i++) {
    await prisma.visitorRequest.create({
      data: {
        communityId: community.id,
        requestedById: users[i % 20].id,
        unitId: units[i % 20].id,
        visitorName: `Visitor ${i + 1}`,
        visitorType: 'GUEST',
        entryMode: 'ON_ARRIVAL',
        status: 'APPROVED',
        validFrom: new Date(),
        gatePass: {
          create: {
            communityId: community.id,
            qrToken: `TOKEN-${i}`,
            passCode: `CODE${i}`,
            status: 'USED',
            expiresAt: new Date(Date.now() + 86400000),
          },
        },
      },
    });
  }

  console.log('Created 20 Visitor Requests');

  // 7. Complaints (15)
  const category = await prisma.maintenanceCategory.create({
    data: { communityId: community.id, name: 'Plumbing' },
  });

  for (let i = 0; i < 15; i++) {
    await prisma.maintenanceTicket.create({
      data: {
        communityId: community.id,
        unitId: units[i].id,
        categoryId: category.id,
        raisedById: users[i].id,
        assignedToId: staffIds[3], // A staff member
        ticketNumber: `TKT-2026-${String(i + 1).padStart(4, '0')}`,
        title: `Complaint ${i + 1}`,
        description: 'Water leak',
        priority: 'MEDIUM',
        status: i % 2 === 0 ? 'OPEN' : 'RESOLVED',
        metadata: {},
      },
    });
  }

  console.log('Created 15 Complaints');

  // 8. Billing (10 Invoices, 10 Payments)
  const cycle = await prisma.invoiceCycle.create({
    data: {
      communityId: community.id,
      name: 'June 2026 Maintenance',
      frequency: 'MONTHLY',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      dueDate: new Date('2026-06-15'),
      baseAmount: 1500,
    },
  });

  for (let i = 0; i < 10; i++) {
    const inv = await prisma.invoice.create({
      data: {
        communityId: community.id,
        cycleId: cycle.id,
        unitId: units[i].id,
        invoiceNumber: `INV-2026-${String(i + 1).padStart(4, '0')}`,
        status: 'PAID',
        subtotal: 1500,
        totalAmount: 1500,
        paidAmount: 1500,
        invoiceDate: new Date(),
        dueDate: cycle.dueDate,
        metadata: {},
        lineItems: {
          create: [{ communityId: community.id, description: 'Base Charge', unitPrice: 1500, total: 1500 }],
        },
      },
    });

    await prisma.payment.create({
      data: {
        communityId: community.id,
        invoiceId: inv.id,
        amount: 1500,
        mode: 'UPI',
        status: 'SUCCESS',
        receiptNumber: `RCP-2026-${String(i + 1).padStart(4, '0')}`,
        paidAt: new Date(),
      },
    });
  }

  console.log('Created 10 Invoices and Payments');
  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
