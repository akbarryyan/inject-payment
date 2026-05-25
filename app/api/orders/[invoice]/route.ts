import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoice: string }> },
) {
  const { invoice } = await params;

  const order = await db.order.findUnique({
    where: { invoice },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ message: 'Order tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json(order);
}
