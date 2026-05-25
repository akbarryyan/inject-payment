import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoice = typeof body.invoice === 'string' ? body.invoice.trim() : '';

    if (!invoice) {
      return NextResponse.json({ message: 'invoice wajib diisi.' }, { status: 400 });
    }

    const order = await db.order.findUnique({ where: { invoice } });

    if (!order) {
      return NextResponse.json({ message: 'Order tidak ditemukan.' }, { status: 404 });
    }

    if (order.status === 'PAID') {
      return NextResponse.json({ message: 'Order sudah dibayar sebelumnya.', already: true });
    }

    await db.order.update({
      where: { invoice },
      data: { status: 'PAID', paidAt: new Date() },
    });

    return NextResponse.json({ message: 'Status order berhasil diperbarui.' });
  } catch {
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
