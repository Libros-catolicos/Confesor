// Versión de los textos legales y textos literales de las casillas de consentimiento.
// Los textos son los del documento legal (B4) y NO se reescriben. Si cambian, sube LEGAL_VERSION.

export const LEGAL_VERSION = '[PENDIENTE: LEGAL_VERSION]'
export const LEGAL_UPDATED = '[PENDIENTE: fecha]'
export const SELLO_EDITORIAL = '[PENDIENTE: nombre del sello editorial]'

export const CONSENT_TEXT = {
  booking:
    'Consiento de forma expresa que Confesor trate mis datos para gestionar esta cita y los comparta con el sacerdote elegido. Sé que reservar revela mis creencias religiosas y que facilitar estos datos es voluntario.',
  minor: 'La cita es para un menor de 14 años y reservo como su padre, madre o tutor.',
  reminders: 'Quiero recibir un recordatorio por correo el día antes de la cita.',
  faithful:
    'Tengo 14 años o más y consiento de forma expresa que Confesor trate mis datos, incluidos mi historial de citas y las fechas de confesión que yo anote, que revelan mis creencias religiosas. Puedo retirar este consentimiento y borrar mi cuenta cuando quiera.',
  priest:
    'Consiento de forma expresa que Confesor trate mis datos para verificar mi condición de sacerdote y publique en internet mi nombre, parroquia, horarios, idiomas y presentación. Me comprometo a usar los datos de los fieles solo para atender sus citas.',
  newsletter: `Soy mayor de 18 años y quiero recibir por correo recomendaciones de libros católicos editados por el titular de Confesor ${SELLO_EDITORIAL}, también dentro de los correos de bienvenida y de cita, y el libro electrónico de regalo. Puedo darme de baja en cada envío.`,
} as const

export type ConsentKind = 'service' | 'newsletter' | 'minor_guardian' | 'reminders'
export type SubjectType = 'booking' | 'faithful' | 'priest' | 'newsletter'
