// Formateo de fechas. Las horas se muestran siempre en la zona horaria del
// lugar (parroquia), no en la del navegador, para evitar confusiones.

export function fmtFechaHora(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(iso))
}

export function fmtFecha(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(new Date(iso))
}

export function fmtHora(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(iso))
}

/** Clave YYYY-MM-DD en la zona indicada, para agrupar huecos por día */
export function claveDia(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(new Date(iso))
}

/** "HH:MM:SS" (time de Postgres) → "HH:MM" */
export function horaCorta(t: string) {
  return t.slice(0, 5)
}
