import { db } from './db';

/**
 * Generate invoice berurutan per bulan.
 * Format: {PREFIX}/{YYYY}/{MM}/{NNNN}
 * Contoh: TRX/2026/05/0001
 *
 * Sequence reset setiap bulan baru.
 * Angka di-pad 4 digit (0001–9999). Lewat 9999 tetap bertambah (5 digit+).
 */
export async function generateInvoice(): Promise<string> {
  const prefix = (process.env.INVOICE_PREFIX ?? 'INV').toUpperCase();

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  // Cari invoice terakhir bulan ini dengan prefix yang sama
  const pattern = `${prefix}/${year}/${month}/%`;

  const last = await db.order.findFirst({
    where: { invoice: { startsWith: `${prefix}/${year}/${month}/` } },
    orderBy: { id: 'desc' },
    select: { invoice: true },
  });

  let nextSeq = 1;
  if (last) {
    const parts = last.invoice.split('/');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  const seq = nextSeq.toString().padStart(4, '0');
  return `${prefix}/${year}/${month}/${seq}`;
}
