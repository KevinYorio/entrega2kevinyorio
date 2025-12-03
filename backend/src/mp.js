// src/mp.js
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

export function initMP() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Falta MP_ACCESS_TOKEN en .env');
  }
  // Cliente SDK v2+
  const client = new MercadoPagoConfig({
    accessToken,
  });

  // Devolvemos helpers para Preference/Payment
  return {
    preference: new Preference(client),
    payment: new Payment(client),
  };
}
