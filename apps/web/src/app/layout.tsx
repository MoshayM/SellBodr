import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'SellBodr — Find Products in India. Sell Globally.',
    template: '%s · SellBodr',
  },
  description: 'AI-powered cross-border eCommerce intelligence. Discover high-margin India-sourced products and sell on Amazon, Etsy, eBay & 70+ global marketplaces.',
  keywords: ['cross-border ecommerce', 'India sourcing', 'Amazon FBA', 'product research', 'AI ecommerce intelligence'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SellBodr',
  },
  icons: {
    icon: [
      { url: '/icons/icon-app.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/icon-app.svg',
  },
  openGraph: {
    title: 'SellBodr — Find Products in India. Sell Globally.',
    description: 'AI-powered cross-border eCommerce intelligence. Discover profitable India-sourced products for Amazon, Etsy & global marketplaces.',
    type: 'website',
    siteName: 'SellBodr',
  },
  twitter: {
    card: 'summary',
    title: 'SellBodr — eCommerce Intelligence',
    description: 'Discover high-margin India-sourced products and sell globally.',
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
    <html lang="en" className="antialiased">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
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
