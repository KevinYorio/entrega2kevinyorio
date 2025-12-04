// src/routes/webhook.js
import { Router } from 'express';                     // Importa Router para definir rutas específicas
import { PrismaClient } from '@prisma/client';        // ORM Prisma para consultas SQL
import { initMP } from '../mp.js';                    // Inicializador de Mercado Pago (SDK v2)

const prisma = new PrismaClient();                    // Crea instancia de Prisma
const router = Router();                              // Router de Express
const mp = initMP();                                  // Inicializa Mercado Pago SDK

// Ruta que recibe los webhooks enviados por Mercado Pago
router.post('/mercadopago/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;                  // Extrae datos principales enviados por MP
    let paymentId = data?.id || req.query['data.id']; // Detecta el ID del pago desde body o querystring

    // Compatibilidad con query de versión anterior
    if (!paymentId && req.query.type === 'payment') {
      paymentId = req.query.id;
    }
    // Si no hay paymentId, devolvemos OK para cortar reintentos
    if (!paymentId) {
      return res.status(200).json({ received: true });
    }

    // Obtiene el pago real desde Mercado Pago usando SDK v2
    // mp.payment.get({ id })
    const payment = await mp.payment.get({ id: paymentId });

    const external_reference = payment.external_reference; // orderId enviado al crear preferencia
    const status = payment.status;                         // Estado del pago (approved, rejected...)
    const method = payment.payment_method?.type || payment.payment_type_id || null; // Método usado
    const amount = Math.round(payment.transaction_amount || 0);                     // Importe

    const orderId = parseInt(external_reference, 10);       // Convierte referencia externa a número
    if (!Number.isInteger(orderId)) {
      return res.status(200).json({ ok: true });            // Ignora si no es una orden válida
    }

    // Crea o actualiza el registro de pago en la base de datos
    await prisma.payment.upsert({
      where: { mpPaymentId: String(paymentId) },
      create: {
        orderId,
        mpPaymentId: String(paymentId),
        status,
        method,
        amount,
        detailsJson: JSON.stringify(payment),               // Guarda JSON completo del pago
      },
      update: {
        status,
        method,
        amount,
        detailsJson: JSON.stringify(payment),               // Mantiene sincronizado con MP
      },
    });

    // Actualiza la orden y crea membresía si fue aprobado
    if (status === 'approved') {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'approved' } });

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      const starts = new Date();                            // Fecha de inicio de la membresía
      const ends = new Date();
      ends.setDate(starts.getDate() + 30);                  // Calcula 30 días de duración

      await prisma.membership.create({
        data: {
          userId: order.userId,                             // Usuario que compró
          planId: order.planId,                             // Plan comprado
          startsAt: starts,
          endsAt: ends,
          status: 'active',                                 // Activa de inmediato
        }
      });
    } else if (status === 'rejected') {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'rejected' } });
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { status } }); // Estados intermedios
    }

    return res.status(200).json({ ok: true });              // Respuesta requerida por MP
  } catch (e) {
    console.error('Webhook error:', e);                     // Log interno
    return res.status(200).json({ ok: true });              // Siempre 200 para evitar reintentos infinitos
  }
});

export default router;                                      // Exporta el router
