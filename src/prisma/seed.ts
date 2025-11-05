import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear webhook events in dev
  await prisma.webhookEvent.deleteMany({});
  console.log('✅ Cleared webhook events');

  // Add seed data here as needed
  // Example:
  // await prisma.user.upsert({ ... });

  console.log('🌱 Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });