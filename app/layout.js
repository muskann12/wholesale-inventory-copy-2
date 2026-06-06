// app/layout.js
import './globals.css';
import { DM_Sans, DM_Mono } from 'next/font/google';
import Navbar from './components/Navbar';
import BarcodeListener from './components/BarcodeListener';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
});

export const metadata = {
  title: 'Shaukat Collection Inventory',
  description: 'Inventory management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 54px)' }}>
          {children}
        </main>
        <BarcodeListener />
      </body>
    </html>
  );
}