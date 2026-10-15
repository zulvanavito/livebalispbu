import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Live SPBU Bali | Pantau Antrean & Stok BBM Realtime',
  description:
    'Pantau kondisi antrean, stok BBM (Pertalite, Pertamax, Solar), dan CCTV ATCS lalu lintas SPBU di Denpasar & Badung, Bali.',
  keywords: ['SPBU Bali', 'Antrean Bensin Bali', 'CCTV ATCS Denpasar', 'CCTV Badung', 'Pertalite Bali'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Live SPBU',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} font-sans h-full antialiased`}
    >
      <body className="h-full w-full bg-white text-zinc-900 flex flex-col">{children}</body>
    </html>
  );
}
