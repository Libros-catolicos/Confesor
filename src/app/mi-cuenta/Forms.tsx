'use client'

import { useActionState, useState } from 'react'
import { borrarCuenta, guardarAvisos, registrarConfesion, type CuentaState } from './actions'

export function ConfesionForm() {
  const [state, action, pending] = useActionState<CuentaState, FormData>(registrarConfesion, undefined)
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <form action={action} className="flex flex-wrap items-end gap-2" key={state?.ok}>
      <div>
        <label htmlFor="fecha" className="label">
          Me he confesado el
        </label>
        <input id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} required className="input" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Anotar'}
      </button>
      {state?.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="w-full text-sm text-green-800">{state.ok}</p>}
    </form>
  )
}

export function AvisosForm({ notify, reminderDays }: { notify: boolean; reminderDays: number }) {
  const [state, action, pending] = useActionState<CuentaState, FormData>(guardarAvisos, undefined)

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify_appointments" defaultChecked={notify} className="accent-accent" />
        Recordarme mis citas el día antes
      </label>
      <div>
        <label htmlFor="reminder_days" className="label">
          Avisarme si llevo tiempo sin confesarme
        </label>
        <select id="reminder_days" name="reminder_days" defaultValue={reminderDays} className="input">
          <option value={0}>No, gracias</option>
          <option value={30}>Al mes</option>
          <option value={60}>A los dos meses</option>
          <option value={90}>A los tres meses</option>
          <option value={180}>A los seis meses</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Se calcula desde tu última confesión anotada o tu última cita de confesión.
        </p>
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-800">{state.ok}</p>}
      <button type="submit" className="btn-secondary self-start" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar avisos'}
      </button>
    </form>
  )
}

export function BorrarCuenta() {
  const [abierto, setAbierto] = useState(false)

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-sm text-red-700 underline">
        Borrar mi cuenta y todos mis datos
      </button>
    )
  }

  return (
    <form action={borrarCuenta} className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
      <p>
        Se eliminarán tu cuenta, tu historial y tus datos de contacto en las citas. Las citas futuras
        quedarán canceladas. <strong>No se puede deshacer.</strong>
      </p>
      <div>
        <label htmlFor="confirmar" className="label">
          Escribe BORRAR para confirmar
        </label>
        <input id="confirmar" name="confirmar" className="input" autoComplete="off" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary bg-red-700 hover:bg-red-800">
          Borrar definitivamente
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  )
}
