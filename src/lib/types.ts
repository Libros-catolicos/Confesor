// Tipos espejo del esquema de supabase/migrations. Mantener sincronizados.

export type UserRole = 'sacerdote' | 'admin'
export type PriestStatus = 'pendiente' | 'verificado' | 'rechazado' | 'suspendido'
export type SlotType = 'confesion' | 'conversacion'
export type AppointmentStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'completada'
  | 'no_presentado'

export const SLOT_TYPE_LABEL: Record<SlotType, string> = {
  confesion: 'Confesión',
  conversacion: 'Conversación',
}

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
  no_presentado: 'No se presentó',
}

export const PRIEST_STATUS_LABEL: Record<PriestStatus, string> = {
  pendiente: 'Pendiente de verificación',
  verificado: 'Verificado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
}

export const WEEKDAYS = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
  { value: 6, label: 'Sábado', short: 'S' },
  { value: 7, label: 'Domingo', short: 'D' },
] as const

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Priest {
  id: string
  slug: string
  display_name: string
  bio: string | null
  diocese: string | null
  languages: string[]
  status: PriestStatus
  verification_notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface Place {
  id: string
  name: string
  address: string
  city: string | null
  country: string
  location: unknown // geography(Point) — usar lat/lng desde RPC o insertar con 'SRID=4326;POINT(lng lat)'
  timezone: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AvailabilityRule {
  id: string
  priest_id: string
  place_id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
  type: SlotType
  active: boolean
  created_at: string
}

export interface Absence {
  id: string
  priest_id: string
  date: string
  start_time: string | null
  end_time: string | null
  note: string | null
  created_at: string
}

export interface Appointment {
  id: string
  priest_id: string
  place_id: string
  starts_at: string
  ends_at: string
  type: SlotType
  language: string
  status: AppointmentStatus
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  manage_token: string
  created_at: string
  updated_at: string
}

/** Fila devuelta por la RPC search_priests */
export interface SearchResult {
  priest_id: string
  slug: string
  display_name: string
  photo_url: string | null
  languages: string[]
  place_id: string
  place_name: string
  address: string
  city: string | null
  distance_km: number
  next_slot: string | null
  free_slots: number
}

/** Fila devuelta por la RPC priest_free_slots */
export interface FreeSlot {
  place_id: string
  starts_at: string
  ends_at: string
  type: SlotType
  slot_minutes: number
}
