import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = 'SUPERADMIN-01';
  const adminPassword = 'SuperAdminPassword123!';
  const bcryptSaltRounds = 10;
  
  const passwordHash = await bcrypt.hash(adminPassword, bcryptSaltRounds);

  const platformCommunity = await prisma.community.upsert({
    where: { slug: 'platform-admin' },
    update: {},
    create: {
      name: 'Platform Admin',
      slug: 'platform-admin',
      type: 'COMMERCIAL',
      status: 'ACTIVE',
      address: {
        line1: 'Platform Headquarters',
        city: 'Platform City',
        state: 'Platform State',
        pincode: '000000',
        country: 'India'
      },
      contactEmail: 'admin@societymanager.in',
      contactPhone: '+910000000000',
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash: passwordHash,
      communityId: platformCommunity.id,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      displayName: 'Platform Super Admin',
      email: 'superadmin@societymanager.in',
      phone: '+910000000000',
      firstLoginCompleted: true,
      mustChangePassword: false,
    },
  });

  console.log('Seed completed.');
  console.log(`SuperAdmin created with username: ${adminUsername} and password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
