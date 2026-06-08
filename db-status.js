const { PrismaClient } = require('@prisma/client');

async function checkDb() {
  const prisma = new PrismaClient();
  console.log("=== DB STATUS ===");
  try {
    const communities = await prisma.community.count();
    const residents = await prisma.user.count({ where: { role: 'RESIDENT' } });
    const towers = await prisma.tower.count();
    const units = await prisma.unit.count();
    const staff = await prisma.user.count({ where: { role: { in: ['STAFF', 'GUARD'] } } });
    const visitors = await prisma.visitorRequest.count();
    const maintenance = await prisma.maintenanceTicket.count();
    const invoices = await prisma.invoice.count();

    console.log(`Communities: ${communities}`);
    console.log(`Residents: ${residents}`);
    console.log(`Towers: ${towers}`);
    console.log(`Units: ${units}`);
    console.log(`Staff: ${staff}`);
    console.log(`Visitors: ${visitors}`);
    console.log(`Maintenance Tickets: ${maintenance}`);
    console.log(`Invoices: ${invoices}`);
  } catch(e) {
    console.error("DB Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
checkDb();
