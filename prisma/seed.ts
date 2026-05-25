import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../app/generated/prisma/client';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.order.upsert({
    where: { invoice: 'INV-2026-0001' },
    update: {},
    create: {
      invoice: 'INV-2026-0001',
      status: 'PENDING',
      totalAmount: 91000,
      serviceFee: 1000,
      customerName: 'Budi Santoso',
      customerEmail: 'budi@example.com',
      items: {
        create: [
          { name: 'Kopi Susu Gula Aren', qty: 2, price: 28000 },
          { name: 'Croissant Butter', qty: 1, price: 22000 },
          { name: 'Mineral Water 600ml', qty: 2, price: 6000 },
        ],
      },
    },
  });

  console.log('Seed selesai: order INV-2026-0001 sudah ada di database.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
