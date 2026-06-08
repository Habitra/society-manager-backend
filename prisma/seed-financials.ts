import { PrismaClient, UnitType, UnitOccupancyType, OccupancyType, InvoiceCycleFrequency, InvoiceStatus, PaymentMode, PaymentStatus } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  const admin = await prisma.user.findFirst({ where: { role: 'COMMUNITY_ADMIN' }, include: { community: true } });
  const community = admin?.community;
  
  if (!community) {
    console.log('No community admin found.');
    return;
  }
  const communityId = community.id;

  // 1. Create a Tower if not exists
  let tower = await prisma.tower.findFirst({ where: { communityId } });
  if (!tower) {
    tower = await prisma.tower.create({
      data: {
        communityId,
        name: 'Tower A',
        code: 'A',
        totalFloors: 10,
        totalUnits: 40,
      }
    });
  }

  // 2. Create Units & Residents (30 units)
  console.log('Creating units and residents...');
  const units = [];
  const residents = [];
  
  for (let i = 1; i <= 30; i++) {
    const floor = Math.ceil(i / 4);
    const unitNumber = `A-${floor}0${(i % 4) + 1}`;
    
    const unit = await prisma.unit.create({
      data: {
        communityId,
        towerId: tower.id,
        unitNumber,
        floor,
        type: UnitType.APARTMENT,
        occupancy: UnitOccupancyType.OWNER,
        areaSqFt: 1000 + Math.floor(Math.random() * 1000),
      }
    });
    units.push(unit);

    // Create resident user
    const resident = await prisma.user.create({
      data: {
        communityId,
        role: 'RESIDENT',
        status: 'ACTIVE',
        username: `resident_${unitNumber.toLowerCase()}`,
        email: `resident_${i}@example.com`,
        phone: '9876543210',
        passwordHash: 'dummy',
        displayName: `Resident ${unitNumber}`,
        firstLoginCompleted: true,
        mustChangePassword: false,
      }
    });
    residents.push(resident);

    // Assign resident
    await prisma.residentUnitAssignment.create({
      data: {
        communityId,
        userId: resident.id,
        unitId: unit.id,
        occupancyType: OccupancyType.OWNER_RESIDENT,
        isPrimary: true,
      }
    });
  }

  // 3. Create Invoice Cycles
  console.log('Creating invoice cycles...');
  const cycles = [];
  const startMonth = new Date();
  startMonth.setMonth(startMonth.getMonth() - 4); // Last 4 months
  
  for (let i = 0; i < 4; i++) {
    const cycleStart = new Date(startMonth);
    cycleStart.setMonth(cycleStart.getMonth() + i);
    cycleStart.setDate(1);
    
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(0);
    
    const dueDate = new Date(cycleStart);
    dueDate.setDate(15);
    
    const monthName = cycleStart.toLocaleString('default', { month: 'long' });
    const year = cycleStart.getFullYear();

    const cycle = await prisma.invoiceCycle.create({
      data: {
        communityId,
        name: `${monthName} ${year} Maintenance`,
        frequency: InvoiceCycleFrequency.MONTHLY,
        startDate: cycleStart,
        endDate: cycleEnd,
        dueDate,
        baseAmount: 3000,
        isPublished: true,
      }
    });
    cycles.push(cycle);
  }

  // 4. Generate Invoices (30 units * 4 cycles = 120 invoices)
  console.log('Generating invoices...');
  const invoices = [];
  let invoiceCounter = 1;
  
  for (const cycle of cycles) {
    for (const unit of units) {
      // Determine if paid or unpaid based on randomness
      // Make older cycles mostly paid, newer cycles less paid to create outstanding
      const cycleIndex = cycles.indexOf(cycle);
      const isPaid = Math.random() > (cycleIndex * 0.2); // 100%, 80%, 60%, 40%
      const isPartiallyPaid = !isPaid && Math.random() > 0.8;
      
      const hasPenalty = !isPaid && cycleIndex < 3; // Old unpaid get penalty
      
      const maintenance = 3000;
      const parking = Math.floor(Math.random() * 3) * 500;
      const subtotal = maintenance + parking;
      let lateFee = hasPenalty ? 250 : 0;
      const totalAmount = subtotal + lateFee;
      
      let paidAmount = 0;
      let status: InvoiceStatus = InvoiceStatus.PENDING;
      
      if (isPaid) {
        paidAmount = totalAmount;
        status = InvoiceStatus.PAID;
      } else if (isPartiallyPaid) {
        paidAmount = Math.floor(totalAmount / 2);
        status = InvoiceStatus.PARTIALLY_PAID;
      } else if (new Date() > cycle.dueDate) {
        status = InvoiceStatus.OVERDUE;
      }
      
      const inv = await prisma.invoice.create({
        data: {
          communityId,
          cycleId: cycle.id,
          unitId: unit.id,
          invoiceNumber: `INV-${cycle.startDate.getFullYear()}-${(cycle.startDate.getMonth() + 1).toString().padStart(2, '0')}-${invoiceCounter.toString().padStart(4, '0')}`,
          status,
          subtotal,
          lateFee,
          totalAmount,
          paidAmount,
          dueDate: cycle.dueDate,
          invoiceDate: cycle.startDate,
        }
      });
      invoices.push(inv);
      invoiceCounter++;
      
      // Line Items
      await prisma.invoiceLineItem.create({
        data: {
          communityId, invoiceId: inv.id, description: 'Monthly Maintenance', quantity: 1, unitPrice: maintenance, total: maintenance
        }
      });
      if (parking > 0) {
        await prisma.invoiceLineItem.create({
          data: {
            communityId, invoiceId: inv.id, description: 'Parking Charges', quantity: 1, unitPrice: parking, total: parking
          }
        });
      }
      if (lateFee > 0) {
        await prisma.invoiceLineItem.create({
          data: {
            communityId, invoiceId: inv.id, description: 'Late Payment Penalty', quantity: 1, unitPrice: lateFee, total: lateFee
          }
        });
      }

      // 5. Generate Payments
      if (paidAmount > 0) {
        await prisma.payment.create({
          data: {
            communityId,
            invoiceId: inv.id,
            amount: paidAmount,
            mode: PaymentMode.UPI,
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(cycle.startDate.getTime() + Math.random() * (cycle.endDate.getTime() - cycle.startDate.getTime())),
            receiptNumber: `RCPT-${inv.id.substring(0, 8)}`,
          }
        });
      }
    }
  }

  console.log('Financial seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
