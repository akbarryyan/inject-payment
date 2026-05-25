'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export type ToastData = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type Props = {
  toasts: ToastData[];
  onRemove: (id: string) => void;
};

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const styles: Record<ToastType, string> = {
  success: 'bg-white border-l-4 border-green-500 text-slate-800',
  error: 'bg-white border-l-4 border-red-500 text-slate-800',
  info: 'bg-white border-l-4 border-blue-500 text-slate-800',
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // trigger enter animation
    const enter = setTimeout(() => setVisible(true), 10);
    // auto-dismiss
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(onRemove, 300);
    }, 4000);
    return () => { clearTimeout(enter); clearTimeout(dismiss); };
  }, [onRemove]);

  return (
    <div
      className={`flex w-full max-w-sm items-start gap-3 rounded-xl shadow-lg px-4 py-3.5 transition-all duration-300 ${styles[toast.type]} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${iconStyles[toast.type]}`}>{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-slate-500 leading-snug">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => { setVisible(false); setTimeout(onRemove, 300); }}
        className="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
      >
        <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
