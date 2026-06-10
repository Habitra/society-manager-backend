import { PrismaClient, VendorCategory, VendorStatus, RiskLevel, ContractStatus, WorkOrderStatus, ComplianceStatus, TicketPriority } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const COMMUNITY_ID = 'eed51717-b19b-4416-957d-755ac85b7886';
const ADMIN_ID = '5bbe0d24-4014-4d27-af42-6ab30d6794b2';

async function main() {
  console.log(`Starting seeding for Community ID: ${COMMUNITY_ID}`);

  // 1. Vendors (25)
  const vendorCategories = Object.values(VendorCategory);
  const vendorIds = [];
  for (let i = 0; i < 25; i++) {
    const vendor = await prisma.vendor.create({
      data: {
        communityId: COMMUNITY_ID,
        name: faker.company.name(),
        category: faker.helpers.arrayElement(vendorCategories),
        contactPerson: faker.person.fullName(),
        phone: faker.phone.number({ style: 'national' }).slice(0, 20),
        email: faker.internet.email(),
        status: faker.helpers.arrayElement(Object.values(VendorStatus)),
        riskLevel: faker.helpers.arrayElement(Object.values(RiskLevel)),
      },
    });
    vendorIds.push(vendor.id);
  }
  console.log(`Seeded 25 Vendors`);

  // 2. Contracts (40)
  const contractIds = [];
  for (let i = 0; i < 40; i++) {
    const startDate = faker.date.past();
    const endDate = faker.date.future();
    const contract = await prisma.contract.create({
      data: {
        communityId: COMMUNITY_ID,
        vendorId: faker.helpers.arrayElement(vendorIds),
        contractNumber: `CTR-${faker.string.alphanumeric(6).toUpperCase()}`,
        value: faker.number.int({ min: 5000, max: 100000 }),
        startDate,
        endDate,
        noticePeriod: 30,
        paymentTerms: 'Net 30',
        sla: 'Standard SLA terms applied.',
        status: faker.helpers.arrayElement(Object.values(ContractStatus)),
      },
    });
    contractIds.push(contract.id);
  }
  console.log(`Seeded 40 Contracts`);

  // 3. Work Orders (100)
  // Need some maintenance tickets to link or we can leave ticketId null.
  for (let i = 0; i < 100; i++) {
    await prisma.workOrder.create({
      data: {
        communityId: COMMUNITY_ID,
        vendorId: faker.helpers.arrayElement(vendorIds),
        orderNumber: `WO-${faker.string.alphanumeric(6).toUpperCase()}`,
        priority: faker.helpers.arrayElement(Object.values(TicketPriority)),
        assignedDate: faker.date.recent(),
        dueDate: faker.date.soon(),
        status: faker.helpers.arrayElement(Object.values(WorkOrderStatus)),
        cost: faker.number.int({ min: 100, max: 5000 }),
      },
    });
  }
  console.log(`Seeded 100 Work Orders`);

  // 4. Compliance Records (200)
  for (let i = 0; i < 200; i++) {
    await prisma.complianceRecord.create({
      data: {
        communityId: COMMUNITY_ID,
        vendorId: faker.helpers.arrayElement(vendorIds),
        documentType: faker.helpers.arrayElement(['Insurance', 'Trade License', 'Tax Certificate', 'Safety Audit']),
        status: faker.helpers.arrayElement(Object.values(ComplianceStatus)),
        expiryDate: faker.date.future(),
      },
    });
  }
  console.log(`Seeded 200 Compliance Records`);

  // 5. Vendor Feedback (50)
  for (let i = 0; i < 50; i++) {
    await prisma.vendorFeedback.create({
      data: {
        communityId: COMMUNITY_ID,
        vendorId: faker.helpers.arrayElement(vendorIds),
        userId: ADMIN_ID,
        rating: faker.number.float({ min: 1, max: 5, fractionDigits: 2 }),
        comments: faker.lorem.sentence(),
        source: faker.helpers.arrayElement(['RESIDENT', 'ADMIN']),
      },
    });
  }
  console.log(`Seeded 50 Vendor Feedbacks`);

  // 6. Vendor Performance Metrics (50)
  for (let i = 0; i < 50; i++) {
    await prisma.vendorPerformanceMetric.create({
      data: {
        communityId: COMMUNITY_ID,
        vendorId: faker.helpers.arrayElement(vendorIds),
        metricType: faker.helpers.arrayElement(['SLA_BREACH', 'COMPLETION_DELAY_DAYS', 'SECURITY_INCIDENT']),
        metricValue: faker.number.int({ min: 1, max: 10 }),
        notes: faker.lorem.sentence(),
      },
    });
  }
  console.log(`Seeded 50 Vendor Performance Metrics`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
