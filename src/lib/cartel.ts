import 'server-only'

import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

// Cartel A4 para imprimir y colgar en la puerta de la iglesia o del confesionario:
// una frase, el código QR de la ficha del sacerdote y el enlace escrito.

const A4 = { ancho: 595.28, alto: 841.89 }
const MORADO = rgb(0.357, 0.165, 0.525) // #5b2a86
const TINTA = rgb(0.122, 0.102, 0.09)
const SUAVE = rgb(0.42, 0.384, 0.36)

interface Datos {
  nombre: string
  url: string
  lugar?: string | null
}

/** Parte el texto en líneas que quepan en `ancho` */
function lineas(texto: string, font: PDFFont, tam: number, ancho: number) {
  const palabras = texto.split(' ')
  const salida: string[] = []
  let linea = ''
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (font.widthOfTextAtSize(prueba, tam) > ancho && linea) {
      salida.push(linea)
      linea = palabra
    } else {
      linea = prueba
    }
  }
  if (linea) salida.push(linea)
  return salida
}

function centrado(page: PDFPage, texto: string, y: number, font: PDFFont, tam: number, color = TINTA) {
  const x = (A4.ancho - font.widthOfTextAtSize(texto, tam)) / 2
  page.drawText(texto, { x, y, size: tam, font, color })
}

export async function cartelPdf({ nombre, url, lugar }: Datos) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Confesor · ${nombre}`)
  pdf.setSubject('Cartel para reservar cita de confesión')
  pdf.setCreator('Confesor')

  const page = pdf.addPage([A4.ancho, A4.alto])
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold)
  const normal = await pdf.embedFont(StandardFonts.Helvetica)

  // Franja superior con el nombre del servicio y una cruz
  page.drawRectangle({ x: 0, y: A4.alto - 96, width: A4.ancho, height: 96, color: MORADO })
  const cx = A4.ancho / 2
  page.drawRectangle({ x: cx - 46, y: A4.alto - 72, width: 5, height: 46, color: rgb(1, 1, 1) })
  page.drawRectangle({ x: cx - 58, y: A4.alto - 58, width: 29, height: 5, color: rgb(1, 1, 1) })
  page.drawText('Confesor', { x: cx - 18, y: A4.alto - 62, size: 26, font: negrita, color: rgb(1, 1, 1) })

  // Titular
  const titulo = `Reserva un rato para confesarte con ${nombre}`
  const filas = lineas(titulo, negrita, 30, A4.ancho - 120)
  let y = A4.alto - 190
  for (const fila of filas) {
    centrado(page, fila, y, negrita, 30)
    y -= 38
  }

  // Instrucción
  y -= 12
  for (const fila of lineas('Escanea el código QR de abajo o entra en el siguiente enlace.', normal, 15, A4.ancho - 140)) {
    centrado(page, fila, y, normal, 15, SUAVE)
    y -= 22
  }

  // Código QR
  const qrPng = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 900,
    color: { dark: '#1f1a17', light: '#ffffff' },
  })
  const qr = await pdf.embedPng(new Uint8Array(qrPng))
  const lado = 280
  const qrY = y - lado - 40
  page.drawRectangle({
    x: cx - lado / 2 - 14,
    y: qrY - 14,
    width: lado + 28,
    height: lado + 28,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.906, 0.882, 0.855),
    borderWidth: 1,
  })
  page.drawImage(qr, { x: cx - lado / 2, y: qrY, width: lado, height: lado })

  // Enlace escrito
  const visible = url.replace(/^https?:\/\//, '')
  let yEnlace = qrY - 56
  centrado(page, visible, yEnlace, negrita, 20, MORADO)

  if (lugar) {
    yEnlace -= 28
    for (const fila of lineas(lugar, normal, 13, A4.ancho - 140)) {
      centrado(page, fila, yEnlace, normal, 13, SUAVE)
      yEnlace -= 18
    }
  }

  // Pie
  page.drawRectangle({ x: 120, y: 118, width: A4.ancho - 240, height: 1, color: rgb(0.906, 0.882, 0.855) })
  centrado(page, 'Sin registrarte y en un minuto: eliges el día y la hora que te vengan bien.', 92, normal, 12, SUAVE)
  centrado(page, 'confesor.es', 68, normal, 11, SUAVE)

  return pdf.save()
}
