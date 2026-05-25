import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pembayaran QRIS — Poppay",
  description: "Halaman pembayaran QRIS via Poppay Gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
