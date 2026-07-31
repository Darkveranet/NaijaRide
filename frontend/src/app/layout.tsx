import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'NaijaRide — Book intercity car trips in Nigeria',
  description: 'Travel between Nigerian cities with verified drivers. Search, compare and book seats in advance.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a8f45' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
