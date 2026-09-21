import { PaginaLegal } from '@/components/PaginaLegal'
import { markdown, titulo } from '@/content/legal/privacidad'

export const metadata = { title: titulo }

// Página estática e indexable
export const dynamic = 'force-static'

export default function Page() {
  return <PaginaLegal titulo={titulo} markdown={markdown} />
}
