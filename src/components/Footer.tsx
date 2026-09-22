import Link from 'next/link'

const ENLACES = [
  { href: '/para-sacerdotes', label: 'Para sacerdotes' },
  { href: '/aviso-legal', label: 'Aviso legal' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/condiciones', label: 'Condiciones de uso' },
  { href: '/contacto', label: 'Contacto' },
] as const

export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href} className="hover:text-accent hover:underline">
            {e.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2">Confesor · Los datos de las citas solo los ve el sacerdote que te atiende.</p>
    </footer>
  )
}
