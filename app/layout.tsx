import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ABT Management System - Cement Distribution ERP',
  description: 'Enterprise Level Cement Distribution ERP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased text-slate-800 bg-slate-50`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}