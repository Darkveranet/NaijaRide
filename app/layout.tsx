import './globals.css';
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { Chatbot } from '@/components/shared/chatbot';
import { SosButton } from '@/components/shared/sos-button';
import { PwaRegister } from '@/components/pwa-register';
import { InstallPrompt } from '@/components/install-prompt';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
});

// basePath is injected by the GitHub Pages deploy workflow (e.g. "/naijaride").
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Next 13.5: viewport/themeColor live inside metadata (the separate `viewport`
// export arrived in Next 14). This keeps the repo on its current Next version.
export const metadata: Metadata = {
  title: 'NaijaRide — Intercity Car Trip Booking',
  description:
    'Book verified car owners for safe, affordable intercity trips across Nigeria. Lagos to Abuja, Port Harcourt to Enugu — travel with trust.',
  applicationName: 'NaijaRide',
  manifest: `${BASE}/manifest.webmanifest`,
  themeColor: '#16a34a',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'NaijaRide' },
  icons: { icon: `${BASE}/favicon-48.png`, apple: `${BASE}/apple-touch-icon.png` },
  openGraph: {
    title: 'NaijaRide — Intercity Car Trip Booking',
    description: 'Book verified drivers for intercity trips across Nigeria.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} font-sans`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <Chatbot />
            <SosButton />
            <PwaRegister />
            <InstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
