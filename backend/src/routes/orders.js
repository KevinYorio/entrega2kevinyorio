// src/routes/orders.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { initMP } from '../mp.js';

const prisma = new PrismaClient();
const router = Router();
const mp = initMP(); // { preference, payment }

// Middleware simple de autenticación por JWT
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;

  try {
    // Verifica el token JWT usando la clave del .env
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    // Guardamos el ID del usuario para las rutas
    req.userId = payload.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}

// Validación del body para crear orden (planId obligatorio)
const CreateOrderSchema = z.object({
  planId: z.number().int(),
  payNow: z.boolean().default(true),
});

// Normalización de la base URL pública (túnel, Cloudflare, etc.)
const PUBLIC_BASE_URL = ((process.env.PUBLIC_BASE_URL || 'http://localhost:4000')
  .trim()
  .replace(/\/+$/, ''));

// Crear una orden
router.post('/', auth, async (req, res) => {
  try {
    // Valida cuerpo con Zod
    const { planId, payNow } = CreateOrderSchema.parse(req.body);

    // Trae el plan de la BD
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    // Crea la orden en la BD (estado inicial: pending)
    const order = await prisma.order.create({
      data: {
        userId: req.userId,
        planId: plan.id,
        priceAtMoment: plan.price,
        status: 'pending',
      },
    });

    // Si el usuario NO quiere pagar ahora → solo crea orden
    if (!payNow) {
      return res.json({ ok: true, orderId: order.id, checkout: null });
    }

    // Construcción del cuerpo para MercadoPago (SDK v2)
    const preferenceBody = {
      items: [{
        title: `ATIX - ${plan.name}`,
        quantity: 1,
        currency_id: plan.currency,
        unit_price: plan.price,
      }],
      external_reference: String(order.id),
      back_urls: {
        success: `${PUBLIC_BASE_URL}/api/orders/thanks?status=success`,
        pending: `${PUBLIC_BASE_URL}/api/orders/thanks?status=pending`,
        failure: `${PUBLIC_BASE_URL}/api/orders/thanks?status=failure`,
      },
      auto_return: 'approved',
      notification_url: process.env.MP_WEBHOOK_URL, // webhook del backend
    };

    // Crea la preferencia en MercadoPago
    const pref = await mp.preference.create({ body: preferenceBody });

    // Actualiza la orden con datos de la preferencia
    await prisma.order.update({
      where: { id: order.id },
      data: {
        preferenceId: pref.id,
        externalReference: String(order.id),
      },
    });

    // Devuelve al frontend la info para abrir el checkout
    res.json({
      ok: true,
      orderId: order.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
    });

  } catch (e) {
    console.error('Crear orden error:', e);
    res.status(400).json({ error: e.message || 'Error al crear orden' });
  }
});

// Generar cupón PagoFácil/RapiPago
router.post('/:orderId/pay-cash', auth, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const method = (req.body?.method || 'pagofacil').toLowerCase();

    // Validar método permitido
    if (!['pagofacil', 'rapipago'].includes(method)) {
      return res.status(400).json({ error: 'Método inválido. Use pagofacil o rapipago.' });
    }

    // Traer orden junto con plan y usuario
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true, user: true },
    });

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.userId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Verifica si la orden puede generar cupón
    if (!['pending', 'rejected'].includes(order.status)) {
      return res.status(400).json({ error: 'La orden no permite generar cupón' });
    }

    // Crear pago tipo ticket en MercadoPago
    const paymentResp = await mp.payment.create({
      body: {
        transaction_amount: order.priceAtMoment,
        description: `ATix - ${order.plan.name}`,
        payment_method_id: method,
        payer: {
          email: order.user.email,
          first_name: order.user.firstName,
          last_name: order.user.lastName,
        },
        external_reference: String(order.id),
        notification_url: process.env.MP_WEBHOOK_URL,
      },
    });

    const p = paymentResp;
    const mpPaymentId = String(p.id);
    const status = p.status;

    // Obtención del ticket (PDF/HTML/QR)
    const ticketUrl =
      p?.point_of_interaction?.transaction_data?.ticket_url ||
      p?.transaction_details?.external_resource_url ||
      p?.point_of_interaction?.transaction_data?.qr_code_base64 ||
      null;

    // Guardar/actualizar el pago en la BD
    await prisma.payment.upsert({
      where: { mpPaymentId },
      create: {
        orderId: order.id,
        mpPaymentId,
        status,
        method: 'ticket:' + method,
        amount: order.priceAtMoment,
        detailsJson: JSON.stringify(p),
      },
      update: {
        status,
        method: 'ticket:' + method,
        amount: order.priceAtMoment,
        detailsJson: JSON.stringify(p),
      },
    });

    // La orden sigue pending; webhook la aprobará luego
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'pending' },
    });

    // Intentar enviar email con link del cupón
    try {
      const { sendMail } = await import('../utils/email.js');
      const html = ticketUrl
        ? `<p>Hola ${order.user.firstName},</p>
           <p>Generamos tu cupón de pago de <b>${method.toUpperCase()}</b> para el plan <b>${order.plan.name}</b>.</p>
           <p>Descargalo desde este enlace: <a href="${ticketUrl}">Cupón de pago</a></p>
           <p>Cuando se acredite el pago, te activamos el plan automáticamente.</p>
           <p>¡Gracias!<br/>ATIX</p>`
        : `<p>Hola ${order.user.firstName},</p>
           <p>Generamos tu orden de pago de <b>${method.toUpperCase()}</b> para el plan <b>${order.plan.name}</b>.</p>
           <p>No se pudo obtener un enlace de cupón directo. Si no te llega otro correo con el cupón, escribinos y te lo reenviamos.</p>`;

      await sendMail({
        to: order.user.email,
        subject: `Cupón de pago ${method.toUpperCase()} - Orden ${order.id}`,
        html,
      });

    } catch (mailErr) {
      console.warn('No se pudo enviar email del cupón:', mailErr.message);
    }

    // Respuesta final al frontend
    return res.json({
      ok: true,
      orderId: order.id,
      paymentId: mpPaymentId,
      status,
      ticket_url: ticketUrl,
      message: 'Cupón generado. Te enviamos el link por email.',
    });

  } catch (e) {
    console.error('pay-cash error:', e);
    return res.status(400).json({ error: e.message || 'Error generando cupón' });
  }
});

// Página simple post-checkout de MP
router.get('/thanks', async (req, res) => {
  res.send(`<html><body>
    <h1>Gracias por tu pago (${req.query.status})</h1>
    <p>Esperá la confirmación final. Si fue aprobado, tu plan quedará activo.</p>
    <a href="${PUBLIC_BASE_URL}">Volver</a>
  </body></html>`);
});

export default router;
