import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SellBodr – Find Products in India. Sell Globally.',
  description: 'AI-powered cross-border eCommerce intelligence. Discover high-margin products in India, sell on Amazon, Etsy, eBay & 70+ global marketplaces.',
  keywords: ['cross-border ecommerce', 'India products', 'Amazon FBA', 'product research', 'AI ecommerce'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SellBodr',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/icons/apple-icon-180.png', sizes: '180x180' }],
    shortcut: '/icons/icon.svg',
  },
  openGraph: {
    title: 'SellBodr – Find Products in India. Sell Globally.',
    description: 'AI-powered cross-border eCommerce intelligence platform.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#020817',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaInstallPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstallPrompt = e;
          });
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.warn('SW registration failed:', err);
              });
            });
          }
        `}} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
