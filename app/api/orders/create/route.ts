import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SERVICE_FEE = 1000;

type ItemInput = { name: string; qty: number; price: number };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, customerEmail, items } = body as {
      customerName: string;
      customerEmail: string;
      items: ItemInput[];
    };

    if (!customerName?.trim() || !customerEmail?.trim()) {
      return NextResponse.json({ message: 'Nama dan email wajib diisi.' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Minimal satu item pesanan.' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.name?.trim() || item.qty < 1 || item.price < 1) {
        return NextResponse.json({ message: 'Data item tidak valid.' }, { status: 400 });
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const totalAmount = subtotal + SERVICE_FEE;

    // Generate invoice: INV-{timestamp}-{random 4 digit}
    const invoice = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await db.order.create({
      data: {
        invoice,
        totalAmount,
        serviceFee: SERVICE_FEE,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        items: {
          create: items.map((i) => ({
            name: i.name.trim(),
            qty: i.qty,
            price: i.price,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
