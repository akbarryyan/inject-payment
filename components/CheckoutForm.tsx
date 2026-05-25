'use client';

import { useState, useCallback } from 'react';
import { QrisPayButton } from './QrisPayButton';
import { ToastContainer, type ToastData } from './Toast';

type Item = { id: string; name: string; qty: string; price: string };

type Order = {
  id: number;
  invoice: string;
  totalAmount: number;
  serviceFee: number;
  customerName: string;
  customerEmail: string;
  items: { id: number; name: string; qty: number; price: number }[];
};

const SERVICE_FEE = 1000;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function parseMoney(val: string) {
  return parseInt(val.replace(/\D/g, ''), 10) || 0;
}

function displayMoney(val: string) {
  const num = parseMoney(val);
  return num > 0 ? num.toLocaleString('id-ID') : '';
}

// ---------------------------------------------------------------------------
// Root — owns toast state so it persists across both steps
// ---------------------------------------------------------------------------

export function CheckoutForm() {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [order, setOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    setToasts((prev) => [...prev, { ...toast, id: generateId() }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleOrderCreated = (data: Order) => {
    setOrder(data);
    setStep('payment');
  };

  const handleBack = () => {
    setStep('form');
    setOrder(null);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {step === 'payment' && order ? (
        <PaymentStep order={order} onBack={handleBack} addToast={addToast} />
      ) : (
        <FormStep onOrderCreated={handleOrderCreated} addToast={addToast} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Fill order form
// ---------------------------------------------------------------------------

type AddToast = (toast: Omit<ToastData, 'id'>) => void;

function FormStep({
  onOrderCreated,
  addToast,
}: {
  onOrderCreated: (order: Order) => void;
  addToast: AddToast;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<Item[]>([
    { id: generateId(), name: '', qty: '1', price: '' },
  ]);

  const addItem = () =>
    setItems((prev) => [...prev, { id: generateId(), name: '', qty: '1', price: '' }]);

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, field: keyof Omit<Item, 'id'>, value: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (field === 'price') return { ...i, price: value.replace(/\D/g, '') };
        if (field === 'qty') return { ...i, qty: value.replace(/\D/g, '') || '1' };
        return { ...i, [field]: value };
      }),
    );
  };

  const subtotal = items.reduce(
    (sum, i) => sum + (parseInt(i.qty) || 0) * parseMoney(i.price),
    0,
  );
  const total = subtotal + SERVICE_FEE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          items: items.map((i) => ({
            name: i.name.trim(),
            qty: parseInt(i.qty) || 1,
            price: parseMoney(i.price),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.message ?? 'Gagal membuat pesanan.';
        setError(msg);
        addToast({ type: 'error', title: 'Gagal', message: msg });
        return;
      }

      addToast({ type: 'success', title: 'Pesanan dibuat', message: `Invoice ${data.invoice}` });
      onOrderCreated(data);
    } catch {
      const msg = 'Koneksi ke server gagal.';
      setError(msg);
      addToast({ type: 'error', title: 'Error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-lg">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Pesanan</h1>
          <p className="mt-1 text-sm text-slate-500">Isi detail pesanan lalu lanjutkan ke pembayaran QRIS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Customer Info */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
              Info Pembeli
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Contoh: budi@email.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
              Item Pesanan
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 px-1">
                <span className="col-span-5 text-xs font-medium text-slate-400">Nama Item</span>
                <span className="col-span-2 text-xs font-medium text-slate-400">Qty</span>
                <span className="col-span-4 text-xs font-medium text-slate-400">Harga (Rp)</span>
                <span className="col-span-1" />
              </div>

              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder={`Item ${idx + 1}`}
                    required
                    className="col-span-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                    className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={displayMoney(item.price)}
                    onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                    placeholder="0"
                    required
                    className="col-span-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="col-span-1 flex items-center justify-center rounded-xl p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-medium text-slate-400 transition hover:border-blue-300 hover:text-blue-500"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Item
            </button>
          </div>

          {/* Price Summary */}
          {subtotal > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Biaya Layanan</span>
                <span>{formatIDR(SERVICE_FEE)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5 text-base font-bold text-slate-900">
                <span>Total</span>
                <span className="text-blue-600">{formatIDR(total)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="mt-0.5 size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || subtotal === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Memproses...
              </>
            ) : (
              <>
                Lanjut ke Pembayaran
                <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Payment view
// ---------------------------------------------------------------------------

function PaymentStep({
  order,
  onBack,
  addToast,
}: {
  order: Order;
  onBack: () => void;
  addToast: AddToast;
}) {
  const handleSuccess = useCallback(
    (message: string) => {
      addToast({ type: 'success', title: 'Pembayaran Berhasil!', message });
    },
    [addToast],
  );

  const handleFailed = useCallback(
    (message: string) => {
      addToast({ type: 'error', title: 'Pembayaran Gagal', message });
    },
    [addToast],
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-4">

        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          >
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Pembayaran</h1>
            <p className="text-xs text-slate-400">Selesaikan pembayaran Anda dengan QRIS</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Ringkasan Pesanan</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {order.invoice}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-50 px-5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">
                    {item.qty} × {formatIDR(item.price)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {formatIDR(item.qty * item.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 px-5 pb-5 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatIDR(order.totalAmount - order.serviceFee)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Biaya Layanan</span>
              <span>{formatIDR(order.serviceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="text-blue-600">{formatIDR(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Info Pembayar</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">Nama</p>
                <p className="text-sm font-medium text-slate-800">{order.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <svg className="size-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-800">{order.customerEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QRIS Payment */}
        <div className="rounded-2xl border border-blue-100 bg-white shadow-sm px-5 py-5">
          <div className="mb-4 flex items-center gap-2">
            <svg className="size-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-700">Metode Pembayaran</h2>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="size-2 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-blue-800">QRIS — Poppay</span>
            <span className="ml-auto text-xs text-blue-500">QR Code</span>
          </div>

          <p className="mb-4 text-xs text-slate-400 leading-relaxed">
            Klik tombol di bawah untuk membuka QR Code. Scan dengan aplikasi e-wallet atau mobile banking yang mendukung QRIS.
          </p>

          <QrisPayButton
            amount={order.totalAmount}
            invoice={order.invoice}
            payorName={order.customerName}
            payorEmail={order.customerEmail}
            onPaymentSuccess={handleSuccess}
            onPaymentFailed={handleFailed}
          />
        </div>

        <p className="text-center text-xs text-slate-400">
          Pembayaran diproses dengan aman melalui{' '}
          <span className="font-medium text-slate-500">Poppay Gateway</span>
        </p>

      </div>
    </div>
  );
}
