/**
 * Konggest — SEO Metadata Configuration
 * Next.js App Router metadata export.
 */

import '@/styles/globals.css';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import Providers from './providers';

const APP_NAME = 'Konggest';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://konggest.vercel.app';
const APP_DESCRIPTION =
  'Konggest — Application SaaS de Gestion du Personnel et des Ressources Humaines. Gérez vos employés, congés, paie, recrutement et performance en toute simplicité.';

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Gestion RH SaaS`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'gestion RH', 'ressources humaines', 'SaaS', 'paie', 'congés',
    'employés', 'recrutement', 'performance', 'pointage', 'SIRH',
    'gestion du personnel', 'logiciel RH', 'Konggest',
  ],
  authors: [{ name: 'Konggest' }],
  creator: 'Konggest',
  publisher: 'Konggest',
  applicationName: APP_NAME,
  generator: 'Next.js',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: APP_URL,
    title: `${APP_NAME} — Gestion RH SaaS`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Konggest — Gestion RH',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Gestion RH SaaS`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },

  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png' }],
  },

  // Manifest
  manifest: '/manifest.json',

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification (à remplir avec vos IDs)
  // verification: {
  //   google: 'your-google-verification-code',
  // },

  // Alternate languages
  alternates: {
    canonical: APP_URL,
    languages: {
      'fr-FR': APP_URL,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0F0F1A' },
    { media: '(prefers-color-scheme: light)', color: '#6366F1' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" dir="ltr">
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Structured Data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: APP_NAME,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: APP_DESCRIPTION,
              url: APP_URL,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
              },
            }),
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
