// src/mp.js
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
// Importa las clases principales del SDK v2 de Mercado Pago:
// - MercadoPagoConfig: crea el cliente base con el accessToken.
// - Preference: permite crear preferencias de pago.
// - Payment: permite consultar pagos y su estado actual.

export function initMP() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  // Obtiene el accessToken desde las variables de entorno (.env).
  // Este token es obligatorio para autenticar todas las llamadas al API de MP.

  if (!accessToken) {
    // Si falta MP_ACCESS_TOKEN el backend no puede operar transacciones.
    throw new Error('Falta MP_ACCESS_TOKEN en .env');
  }

  // Cliente SDK v2+
  const client = new MercadoPagoConfig({
    accessToken, 
    // Crea el cliente del SDK con el token provisto.
    // Aquí también podría agregarse "options" como integrator-id, sandbox, etc.
  });

  // Devolvemos helpers para Preference/Payment
  return {
    // Crea una instancia para gestionar "preferencias"
    // (carrito, checkout, links de pago).
    preference: new Preference(client),

    // Instancia para gestionar "pagos":
    // consultar estado, buscar transacciones, etc.
    payment: new Payment(client),
  };
}
