import './globals.css';
import type { Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';

const inter = localFont({ src: './fonts/Inter-Latin.woff2', variable: '--font-inter', display: 'swap', weight: '100 900' });
const playfair = localFont({ src: './fonts/PlayfairDisplay-Latin.woff2', variable: '--font-playfair', display: 'swap', weight: '400 900' });

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
