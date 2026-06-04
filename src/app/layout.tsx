import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ],
  preload: true,
  adjustFontFallback: true,
});

// FleetCrown-aligned display typography (migration commit 7/N).
// Space Grotesk for display/heading; IBM Plex Mono for code. Body
// stays Inter for now — applying Space Grotesk as the body face is
// a separate decision worth its own user-visible commit.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['500', '600', '700'],
  preload: true,
  adjustFontFallback: true,
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});
import './globals.css';
import Script from 'next/script';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/sonner';
import { Suspense } from 'react';

import type { Metadata, Viewport } from 'next';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, SITE_URL } from '@/config/brand';

// Required for env(safe-area-inset-*) to take effect on iOS (notch + home indicator).
// Without `viewportFit: 'cover'` the inset values resolve to 0.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords:
    'AI economic agent, bitcoin, finance, community, fund, invest, lend, products, services, lightning network, peer-to-peer, pseudonymous, any currency',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OrangeCat - Your AI Economic Agent',
    description: 'Fund, lend, invest, trade, and govern with any identity, any currency.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/images/orange-cat-logo.svg', type: 'image/svg+xml' }],
    apple: '/icons/icon-144x144.png',
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/* Structured data: Organization + WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  name: APP_NAME,
                  url: SITE_URL,
                  logo: `${SITE_URL}/images/orange-cat-logo.svg`,
                  description:
                    'Fund, lend, invest, trade, and govern with any identity, any currency.',
                  sameAs: [],
                },
                {
                  '@type': 'WebSite',
                  name: APP_NAME,
                  url: SITE_URL,
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: `${SITE_URL}/discover?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-tiffany focus:text-white focus:rounded-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <AppShell>
                <Suspense>{children}</Suspense>
              </AppShell>
            </AuthProvider>
          </QueryProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
