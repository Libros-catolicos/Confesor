// Contenido editorial de /recursos. Vive en el repositorio:
//   content/recursos/*.md   artículos (frontmatter: title, summary, section, order)
//   content/libros.json     lectura espiritual recomendada
// Se puede editar directamente en GitHub sin tocar código.

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

export const SECCIONES = [
  { id: 'confesion', titulo: 'Sobre la confesión' },
  { id: 'preparacion', titulo: 'Preparar la confesión' },
  { id: 'dudas', titulo: 'Dudas frecuentes' },
] as const

export type SeccionId = (typeof SECCIONES)[number]['id']

export interface Articulo {
  slug: string
  title: string
  summary: string
  section: SeccionId
  order: number
  html: string
}

export interface Libro {
  titulo: string
  autor: string
  descripcion: string
  url?: string
  portada?: string
  destacado?: boolean
}

const DIR = path.join(process.cwd(), 'content')

export async function listarArticulos(): Promise<Articulo[]> {
  const dir = path.join(DIR, 'recursos')
  const ficheros = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'))
  const articulos = await Promise.all(ficheros.map((f) => leerArticulo(f.replace(/\.md$/, ''))))
  return articulos
    .filter((a): a is Articulo => a !== null)
    .sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order)
}

export async function leerArticulo(slug: string): Promise<Articulo | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  try {
    const raw = await fs.readFile(path.join(DIR, 'recursos', `${slug}.md`), 'utf8')
    const { data, content } = matter(raw)
    const section = SECCIONES.some((s) => s.id === data.section) ? (data.section as SeccionId) : 'confesion'
    return {
      slug,
      title: String(data.title ?? slug),
      summary: String(data.summary ?? ''),
      section,
      order: Number(data.order ?? 99),
      html: await marked.parse(content),
    }
  } catch {
    return null
  }
}

export async function listarLibros(): Promise<Libro[]> {
  try {
    const raw = await fs.readFile(path.join(DIR, 'libros.json'), 'utf8')
    return JSON.parse(raw) as Libro[]
  } catch {
    return []
  }
}
