// Tipos espejo del esquema de supabase/migrations. Mantener sincronizados.

export type UserRole = 'sacerdote' | 'admin' | 'fiel'
export type PriestStatus = 'pendiente' | 'verificado' | 'rechazado' | 'suspendido'
export type SlotType = 'confesion' | 'conversacion'
export type AppointmentStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'completada'
  | 'no_presentado'
  | 'reprogramar'

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
  reprogramar: 'Nueva hora propuesta',
}

export const MIN_NOTICE_OPTIONS = [
  { value: 0, label: 'Sin antelación mínima' },
  { value: 2, label: 'Al menos 2 horas antes' },
  { value: 12, label: 'Al menos 12 horas antes' },
  { value: 24, label: 'Al menos 24 horas antes' },
  { value: 48, label: 'Al menos 48 horas antes' },
] as const

/** Zonas horarias de países hispanohablantes (y algunas más habituales) */
export const TIMEZONES = [
  { value: 'Europe/Madrid', label: 'España (península y Baleares)' },
  { value: 'Atlantic/Canary', label: 'España (Canarias)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Cancun', label: 'México (Cancún)' },
  { value: 'America/Tijuana', label: 'México (Tijuana)' },
  { value: 'America/Guatemala', label: 'Guatemala' },
  { value: 'America/El_Salvador', label: 'El Salvador' },
  { value: 'America/Tegucigalpa', label: 'Honduras' },
  { value: 'America/Managua', label: 'Nicaragua' },
  { value: 'America/Costa_Rica', label: 'Costa Rica' },
  { value: 'America/Panama', label: 'Panamá' },
  { value: 'America/Havana', label: 'Cuba' },
  { value: 'America/Santo_Domingo', label: 'República Dominicana' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Caracas', label: 'Venezuela' },
  { value: 'America/Guayaquil', label: 'Ecuador' },
  { value: 'America/Lima', label: 'Perú' },
  { value: 'America/La_Paz', label: 'Bolivia' },
  { value: 'America/Asuncion', label: 'Paraguay' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Montevideo', label: 'Uruguay' },
  { value: 'America/New_York', label: 'EE. UU. (Este)' },
  { value: 'America/Chicago', label: 'EE. UU. (Centro)' },
  { value: 'America/Denver', label: 'EE. UU. (Montaña)' },
  { value: 'America/Los_Angeles', label: 'EE. UU. (Pacífico)' },
  { value: 'Europe/Lisbon', label: 'Portugal' },
  { value: 'Europe/Rome', label: 'Italia / Vaticano' },
  { value: 'Europe/Paris', label: 'Francia' },
  { value: 'Europe/London', label: 'Reino Unido' },
  { value: 'Africa/Malabo', label: 'Guinea Ecuatorial' },
  { value: 'Asia/Manila', label: 'Filipinas' },
] as const

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
  notify_appointments: boolean
  reminder_days: number
  last_nudge_at: string | null
  created_at: string
  updated_at: string
}

/** Página de inicio según el rol */
export function homeForRole(role: UserRole | null | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'fiel') return '/mi-cuenta'
  return '/panel'
}

export interface Priest {
  id: string
  slug: string
  display_name: string
  bio: string | null
  diocese: string | null
  languages: string[]
  status: PriestStatus
  photo_url: string | null
  min_notice_hours: number
  auto_confirm: boolean
  created_at: string
  updated_at: string
}

/** Datos del sacerdote que nunca se exponen públicamente */
export interface PriestPrivate {
  priest_id: string
  calendar_token: string
  verification_notes: string | null
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
  cancelled_by: 'sacerdote' | 'fiel' | null
  cancel_message: string | null
  proposed_starts_at: string | null
  proposed_ends_at: string | null
  user_id: string | null
  reminder_sent_at: string | null
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
