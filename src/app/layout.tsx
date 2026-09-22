import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ServiceWorker } from '@/components/ServiceWorker'
import { siteUrl } from '@/lib/site'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Confesor',
    template: '%s · Confesor',
  },
  description:
    'Encuentra sacerdotes cerca de ti para confesarte o hablar, y reserva cita sin registrarte.',
  applicationName: 'Confesor',
  // Tarjeta al compartir en WhatsApp, X, Telegram… (imagen en opengraph-image.tsx)
  metadataBase: new URL(siteUrl()),
  openGraph: {
    type: 'website',
    siteName: 'Confesor',
    locale: 'es_ES',
    title: 'Confesor',
    description:
      'Encuentra sacerdotes cerca de ti para confesarte o hablar, y reserva cita sin registrarte.',
  },
  twitter: { card: 'summary_large_image' },
  // App instalable (PWA): el manifiesto lo genera src/app/manifest.ts
  appleWebApp: { capable: true, title: 'Confesor', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#5b2a86',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
        <Footer />
        <ServiceWorker />
      </body>
    </html>
  )
}
