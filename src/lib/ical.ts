// Generación mínima de iCalendar (RFC 5545) sin dependencias.

export interface IcalEvent {
  uid: string
  start: Date
  end: Date
  summary: string
  description?: string
  location?: string
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'
  updated?: Date
}

function fmtUtc(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Corta líneas a 75 octetos como pide la RFC */
function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let i = 75
    while (Buffer.byteLength(rest.slice(0, i), 'utf8') > 75) i--
    out.push(rest.slice(0, i))
    rest = ' ' + rest.slice(i)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcal(calName: string, events: IcalEvent[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Confesor//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${fmtUtc(e.updated ?? new Date())}`,
      `DTSTART:${fmtUtc(e.start)}`,
      `DTEND:${fmtUtc(e.end)}`,
      `SUMMARY:${escape(e.summary)}`
    )
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`)
    if (e.location) lines.push(`LOCATION:${escape(e.location)}`)
    if (e.status) lines.push(`STATUS:${e.status}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
