import nodemailer from 'nodemailer'; 
// Importa nodemailer, la librería estándar para enviar correos a través de SMTP.

/*
 * makeTransport()
 * Crea y devuelve un "transporter" SMTP configurado con las variables del entorno.
 * Es la conexión que nodemailer necesita para poder enviar correos.
 * Si faltan variables obligatorias, corta la ejecución con un error claro.
 */
export function makeTransport() {
  if (!process.env.SMTP_HOST) {
    // Si no existe el host SMTP, significa que el .env está incompleto.
    throw new Error('SMTP no configurado (.env SMTP_HOST/PORT/USER/PASS)');
  }
  return nodemailer.createTransport({
    // Configuración básica del servidor SMTP
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587), // 587 es el puerto estándar para TLS
    secure: false, // 'secure: true' se usa solo si el puerto es 465 (SSL estricto)
    auth: {
      user: process.env.SMTP_USER, // Usuario SMTP del .env
      pass: process.env.SMTP_PASS, // Contraseña SMTP del .env
    }
  });
}

/*
 * sendMail({ to, subject, html, attachments })
 * Envía un correo usando el transporter SMTP creado arriba.
 * Parámetros:
 *   - to: destinatario
 *   - subject: asunto del email
 *   - html: contenido HTML del email
 *   - attachments: adjuntos opcionales (PDF, imágenes, etc.)
 */
export async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = makeTransport();  // Crea un transporter SMTP nuevo para cada envío
  const from = process.env.SMTP_FROM || '"ATIX" <no-reply@atix.com>'; 
  // Dirección por defecto del remitente si no está definida en el .env

  return transporter.sendMail({ from, to, subject, html, attachments });
  // Ejecuta el envío del correo y devuelve la promesa con el resultado
}
