'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QrisSDK } from '@poppackage/qris-payment-sdk';

type Props = {
  amount: number;
  invoice: string;
  payorName: string;
  payorEmail: string;
  onPaymentSuccess?: (message: string) => void;
  onPaymentFailed?: (message: string) => void;
};

type PaymentState = 'idle' | 'loading' | 'success' | 'failed';

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function QrisPayButton({
  amount,
  invoice,
  payorName,
  payorEmail,
  onPaymentSuccess,
  onPaymentFailed,
}: Props) {
  const qrisRef = useRef<QrisSDK | null>(null);
  const [state, setState] = useState<PaymentState>('idle');
  const [paidAt, setPaidAt] = useState<Date | null>(null);

  useEffect(() => {
    qrisRef.current = new QrisSDK({
      amount,
      invoice,
      notes: `Invoice ${invoice}`,
      payor_name: payorName,
      payor_email: payorEmail,
      resultContainerId: 'qris-payment-result',
      onSuccess: async () => {
        setState('loading');
        try {
          const res = await fetch('/api/orders/qris-mark-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice }),
            credentials: 'include',
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg = data.message ?? 'Gagal memperbarui order.';
            setState('failed');
            onPaymentFailed?.(msg);
            return;
          }
          setPaidAt(new Date());
          setState('success');
          onPaymentSuccess?.(data.message ?? 'Pembayaran berhasil dicatat.');
        } catch {
          setState('failed');
          onPaymentFailed?.('Koneksi ke server gagal.');
        }
      },
      onFailed: (status) => {
        console.log('QRIS gagal / timeout:', status);
        setState('failed');
        onPaymentFailed?.('Pembayaran gagal atau kadaluarsa. Silakan coba lagi.');
      },
    });

    return () => { qrisRef.current?.destroy(); };
  }, [amount, invoice, payorName, payorEmail, onPaymentSuccess, onPaymentFailed]);

  const handlePay = useCallback(() => {
    setState('idle');
    qrisRef.current?.openPayment();
  }, []);

  // --- Success screen ---
  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div id="qris-payment-result" />
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
          <svg className="size-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Pembayaran Berhasil!</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatIDR(amount)} telah diterima
          </p>
          {paidAt && (
            <p className="mt-0.5 text-xs text-slate-400">
              {new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(paidAt)}
            </p>
          )}
        </div>
        <div className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left">
          <p className="text-xs text-green-700">
            <span className="font-semibold">Invoice:</span> {invoice}
          </p>
          <p className="text-xs text-green-700">
            <span className="font-semibold">Pembayar:</span> {payorName}
          </p>
        </div>
      </div>
    );
  }

  // --- Failed state — show retry button ---
  if (state === 'failed') {
    return (
      <div className="flex flex-col gap-3">
        <div id="qris-payment-result" />
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 size-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">Pembayaran Gagal</p>
            <p className="text-xs text-red-600 mt-0.5">Pembayaran gagal atau kadaluarsa. Silakan coba lagi.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePay}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Coba Bayar Lagi
        </button>
      </div>
    );
  }

  // --- Idle / Loading ---
  return (
    <div className="flex flex-col gap-3">
      <div id="qris-payment-result" />
      <button
        type="button"
        onClick={handlePay}
        disabled={state === 'loading'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'loading' ? (
          <>
            <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Memverifikasi Pembayaran...
          </>
        ) : (
          <>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Bayar dengan QRIS
          </>
        )}
      </button>
    </div>
  );
}
