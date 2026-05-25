import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Verifikasi HMAC-SHA256 signature dari Poppay.
 *
 * Poppay mengirim header X-Poppay-Signature berisi:
 *   HMAC-SHA256(invoice_id + "|" + timestamp + "|" + amount, WEBHOOK_SECRET)
 *
 * Timestamp dikirim via header X-Poppay-Timestamp.
 * Tolak request jika timestamp > 5 menit dari sekarang (replay attack protection).
 */
async function verifySignature(
  invoiceId: string,
  amount: number,
  timestamp: string,
  receivedSignature: string,
): Promise<boolean> {
  const secret = process.env.POPPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  // Tolak jika timestamp > 5 menit
  const ts = new Date(timestamp).getTime();
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;

  const payload = `${invoiceId}|${timestamp}|${amount}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison untuk mencegah timing attack
  if (expected.length !== receivedSignature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-poppay-signature') ?? '';
    const timestamp = request.headers.get('x-poppay-timestamp') ?? '';

    if (!signature || !timestamp) {
      return NextResponse.json({ message: 'Header signature tidak lengkap.' }, { status: 401 });
    }

    const body = await request.json();

    const {
      invoice_id,
      amount,
      status,
      ref_id,
    }: {
      invoice_id: string;
      amount: number;
      status: string;
      ref_id?: string;
    } = body;

    if (!invoice_id || !amount || !status) {
      return NextResponse.json({ message: 'Payload tidak lengkap.' }, { status: 400 });
    }

    const isValid = await verifySignature(invoice_id, amount, timestamp, signature);
    if (!isValid) {
      console.warn(`[webhook] Signature tidak valid untuk invoice ${invoice_id}`);
      return NextResponse.json({ message: 'Signature tidak valid.' }, { status: 401 });
    }

    const order = await db.order.findUnique({ where: { invoice: invoice_id } });

    if (!order) {
      return NextResponse.json({ message: 'Order tidak ditemukan.' }, { status: 404 });
    }

    // Idempotent: skip jika sudah di-update ke status yang sama
    if (order.status === 'PAID' && status === 'PAID') {
      return NextResponse.json({ message: 'Order sudah berstatus PAID.', skipped: true });
    }

    const mappedStatus = mapStatus(status);

    await db.order.update({
      where: { invoice: invoice_id },
      data: {
        status: mappedStatus,
        ...(mappedStatus === 'PAID' ? { paidAt: new Date() } : {}),
      },
    });

    console.log(
      `[webhook] Order ${invoice_id} → ${mappedStatus}${ref_id ? ` (ref: ${ref_id})` : ''}`,
    );

    return NextResponse.json({ message: 'Status order diperbarui.' });
  } catch (e) {
    console.error('[webhook] Error:', e);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}

function mapStatus(poppayStatus: string) {
  switch (poppayStatus.toUpperCase()) {
    case 'PAID':
    case 'SUCCESS':
    case 'SETTLEMENT':
      return 'PAID' as const;
    case 'FAILED':
    case 'DENY':
    case 'CANCEL':
      return 'FAILED' as const;
    case 'EXPIRED':
      return 'EXPIRED' as const;
    default:
      return 'PENDING' as const;
  }
}
