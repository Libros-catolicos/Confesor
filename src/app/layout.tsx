import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'

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
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          Confesor · Los datos de las citas solo los ve el sacerdote que te atiende.
        </footer>
      </body>
    </html>
  )
}
