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
  metadataBase: new URL('https://livebali.my.id'),
  title: 'Live SPBU Bali | Pantau Antrean & Stok BBM Realtime',
  description:
    'Pantau kondisi antrean, stok BBM (Pertalite, Pertamax, Solar), dan CCTV ATCS lalu lintas SPBU di Denpasar & Badung, Bali.',
  keywords: ['SPBU Bali', 'Antrean Bensin Bali', 'CCTV ATCS Denpasar', 'CCTV Badung', 'Pertalite Bali', 'livebali.my.id'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Live SPBU Bali | Pantau Antrean & Stok BBM Realtime',
    description:
      'Pantau kondisi antrean, ketersediaan BBM (Pertalite, Pertamax, Solar), dan CCTV ATCS lalu lintas di Denpasar & Badung.',
    url: 'https://livebali.my.id',
    siteName: 'Live SPBU Bali',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Live SPBU Bali - livebali.my.id',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live SPBU Bali | Pantau Antrean & Stok BBM Realtime',
    description:
      'Pantau kondisi antrean, ketersediaan BBM, dan CCTV ATCS lalu lintas di Denpasar & Badung.',
    images: ['/og-image.png'],
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
