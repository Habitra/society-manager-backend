/**
 * Maintenance seed script for "Platform" community (eed51717-b19b-4416-957d-755ac85b7886)
 * Creates categories + 15 realistic tickets covering all statuses and priorities.
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const COMMUNITY_ID = 'eed51717-b19b-4416-957d-755ac85b7886';

// Residents in Platform community
const RESIDENTS = [
  { id: '202f0e57-3ef2-4de3-9d52-de530a3b6b41', name: 'Anushka' },
  { id: '5acf8ada-e6c6-4593-aae4-830a63eb78e0', name: 'Any' },
  { id: '8bbff520-a2b9-4b3c-a296-7f40a1941aab', name: 'Test User' },
  { id: 'b9eddc95-4e7f-4394-8084-1458d3706a2f', name: 'Harsh' },
  { id: 'c9177ee9-98b7-435c-9a23-966b80b12deb', name: 'Alice Smith' },
];

// Units in Platform community
const UNITS = [
  '1fa80fc6-2fe8-4904-8385-36e2ef1f9e4a', // Tower A - A-201
  '28c9fd5e-4a6f-455f-92f5-57cb81a30876', // Tower A - A-102
  '2d8f9baa-6a2c-4890-8690-48918613b4ab', // Tower B - B-302
  '30a2aa35-bbe7-4041-b283-ebefa3487902', // Tower B - B-402
  '38907e01-28f3-4e02-a1d8-f46727d6c9ac', // Tower C - C-101
  '409b3dd7-afd9-4fa0-8715-aed4f511588a', // Tower A - A-101
  '42496b81-78f2-4806-a08d-d449e6f25835', // Tower C - C-402
];

async function main() {
  console.log('🔧 Seeding maintenance data for Platform community...');

  // ── 1. Create categories ──────────────────────────────────────────────────
  const categoryDefs = [
    { name: 'Plumbing', icon: 'droplet' },
    { name: 'Electrical', icon: 'zap' },
    { name: 'Carpentry', icon: 'hammer' },
    { name: 'HVAC / Air Conditioning', icon: 'wind' },
    { name: 'Common Area', icon: 'building' },
    { name: 'Pest Control', icon: 'bug' },
  ];

  const categories = [];
  // Delete existing seeded categories to avoid duplication
  await p.maintenanceCategory.deleteMany({ where: { communityId: COMMUNITY_ID } });

  for (let i = 0; i < categoryDefs.length; i++) {
    const cat = await p.maintenanceCategory.create({
      data: {
        communityId: COMMUNITY_ID,
        name: categoryDefs[i].name,
        icon: categoryDefs[i].icon,
        sortOrder: i,
        isActive: true,
      },
    });
    categories.push(cat);
    console.log(`  ✓ Category: ${cat.name} (${cat.id})`);
  }

  // ── 2. Create tickets ─────────────────────────────────────────────────────
  const ticketDefs = [
    // OPEN tickets
    { status: 'OPEN', priority: 'HIGH', title: 'Water leakage in bathroom ceiling', desc: 'There is continuous water dripping from the bathroom ceiling, likely from the unit above. Floor is getting wet and mould is forming.', cat: 0, resident: 0, unit: 0 },
    { status: 'OPEN', priority: 'URGENT', title: 'Main electrical board sparking', desc: 'The main electrical distribution board is sparking intermittently. This is a fire hazard and needs immediate attention.', cat: 1, resident: 1, unit: 1 },
    { status: 'OPEN', priority: 'MEDIUM', title: 'Bedroom door hinge broken', desc: 'The master bedroom door hinge has snapped. The door cannot be properly shut and is a security concern.', cat: 2, resident: 2, unit: 2 },

    // IN_PROGRESS tickets
    { status: 'IN_PROGRESS', priority: 'HIGH', title: 'AC not cooling — compressor issue', desc: 'Split AC in the living room is running but not cooling. Technician reported compressor may need replacement. Parts ordered.', cat: 3, resident: 3, unit: 3, scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { status: 'IN_PROGRESS', priority: 'MEDIUM', title: 'Common area lift malfunction', desc: 'Lift on Block A is stopping between floors. Technician has inspected, awaiting control board replacement.', cat: 4, resident: 4, unit: 4, scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },

    // ON_HOLD tickets
    { status: 'ON_HOLD', priority: 'MEDIUM', title: 'Kitchen sink drain blocked', desc: 'Kitchen sink drain is completely blocked. Plumber visited but said specialized equipment is required. On hold pending equipment availability.', cat: 0, resident: 0, unit: 5 },
    { status: 'ON_HOLD', priority: 'LOW', title: 'Pest infestation in store room', desc: 'Cockroach infestation in the store room. Pest control visited but needs 2nd treatment after 2 weeks. On hold pending follow-up.', cat: 5, resident: 1, unit: 6, scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },

    // RESOLVED tickets
    { status: 'RESOLVED', priority: 'HIGH', title: 'Short circuit in kitchen', desc: 'Repeated tripping of MCB in the kitchen circuit. Electrician identified a faulty socket and replaced it.', cat: 1, resident: 2, unit: 0, resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), rating: 5, ratingNote: 'Excellent service! Fixed within 3 hours.' },
    { status: 'RESOLVED', priority: 'MEDIUM', title: 'Wardrobe sliding door off track', desc: 'Master bedroom wardrobe sliding door has come off its track. Carpenter visited and realigned the track.', cat: 2, resident: 3, unit: 1, resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), rating: 4, ratingNote: 'Good work, took longer than expected but done properly.' },
    { status: 'RESOLVED', priority: 'LOW', title: 'Garden area lighting not working', desc: 'Garden path lights were not functioning. Electrician replaced 3 bulbs and fixed a loose junction box.', cat: 1, resident: 4, unit: 2, resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), rating: 3, ratingNote: 'Took 2 visits to fix.' },

    // CLOSED tickets
    { status: 'CLOSED', priority: 'HIGH', title: 'Water pump failure — no water supply', desc: 'Building water pump failed causing no water supply to upper floors. Pump replaced and supply restored.', cat: 0, resident: 0, unit: 3, resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), closedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), rating: 5, ratingNote: 'Resolved quickly!' },
    { status: 'CLOSED', priority: 'MEDIUM', title: 'Window handle broken', desc: 'Living room window handle is broken and window cannot be secured shut. Handle replaced.', cat: 2, resident: 1, unit: 4, resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), closedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), rating: 4, ratingNote: 'Well done.' },

    // REOPENED tickets
    { status: 'REOPENED', priority: 'URGENT', title: 'Recurrent water seepage in bedroom wall', desc: 'Wall seepage was previously treated but has returned worse than before after the rains. Previous waterproofing treatment failed.', cat: 0, resident: 2, unit: 5 },
    { status: 'REOPENED', priority: 'HIGH', title: 'Elevator emergency button non-functional', desc: 'Elevator emergency call button was repaired last month but has stopped working again. Requires permanent fix.', cat: 4, resident: 3, unit: 6 },

    // Extra OPEN (overdue)
    { status: 'OPEN', priority: 'URGENT', title: 'Gas pipeline smell in kitchen', desc: 'Strong smell of gas near the kitchen pipeline connection. Possible gas leak. Resident has shut off main valve.', cat: 0, resident: 4, unit: 0, scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  ];

  let ticketCounter = 100;
  for (const t of ticketDefs) {
    ticketCounter++;
    const ticketNumber = `MAINT-2026-${String(ticketCounter).padStart(4, '0')}`;
    const catId = categories[t.cat].id;
    const residentId = RESIDENTS[t.resident].id;
    const unitId = UNITS[t.unit];

    const ticket = await p.maintenanceTicket.create({
      data: {
        communityId: COMMUNITY_ID,
        unitId,
        categoryId: catId,
        raisedById: residentId,
        ticketNumber,
        title: t.title,
        description: t.desc,
        priority: t.priority,
        status: t.status,
        scheduledAt: t.scheduledAt || null,
        resolvedAt: t.resolvedAt || null,
        closedAt: t.closedAt || null,
        rating: t.rating || null,
        ratingNote: t.ratingNote || null,
        metadata: {},
      },
    });

    console.log(`  ✓ [${t.status}][${t.priority}] ${ticketNumber}: ${t.title.substring(0, 50)}`);
  }

  // ── 3. Verify ─────────────────────────────────────────────────────────────
  const counts = await p.maintenanceTicket.groupBy({
    by: ['status'],
    where: { communityId: COMMUNITY_ID, deletedAt: null },
    _count: { id: true },
  });
  console.log('\n📊 Ticket counts by status:');
  counts.forEach(c => console.log(`   ${c.status}: ${c._count.id}`));

  const total = await p.maintenanceTicket.count({ where: { communityId: COMMUNITY_ID, deletedAt: null } });
  console.log(`\n✅ Total tickets seeded: ${total}`);
}

main().catch(e => { console.error('❌ Seed failed:', e.message); }).finally(() => p.$disconnect());
