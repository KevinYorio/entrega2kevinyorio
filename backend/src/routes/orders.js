// src/routes/orders.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { initMP } from '../mp.js';

const prisma = new PrismaClient();
const router = Router();
const mp = initMP(); // { preference, payment }

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    req.userId = payload.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'No autorizado' });
  }
}

const CreateOrderSchema = z.object({
  planId: z.number().int(),
  payNow: z.boolean().default(true),
});

// Usamos la URL pública del túnel para back_urls
const PUBLIC_BASE_URL = ((process.env.PUBLIC_BASE_URL || 'http://localhost:4000').trim().replace(/\/+$/, ''));

router.post('/', auth, async (req, res) => {
  try {
    const { planId, payNow } = CreateOrderSchema.parse(req.body);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) return res.status(400).json({ error: 'Plan inválido' });

    const order = await prisma.order.create({
      data: {
        userId: req.userId,
        planId: plan.id,
        priceAtMoment: plan.price,
        status: 'pending',
      },
    });

    if (!payNow) {
      // Orden para pagar después
      return res.json({ ok: true, orderId: order.id, checkout: null });
    }

    // Preferencia MP (SDK v2: se envía dentro de { body: ... })
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
      notification_url: process.env.MP_WEBHOOK_URL, // tu URL pública (Cloudflare)
    };

    const pref = await mp.preference.create({ body: preferenceBody });

    await prisma.order.update({
      where: { id: order.id },
      data: { preferenceId: pref.id, externalReference: String(order.id) }
    });

    res.json({
      ok: true,
      orderId: order.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point
    });
  } catch (e) {
    console.error('Crear orden error:', e);
    res.status(400).json({ error: e.message || 'Error al crear orden' });
  }
});

router.post('/:orderId/pay-cash', auth, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const method = (req.body?.method || 'pagofacil').toLowerCase();

    if (!['pagofacil', 'rapipago'].includes(method)) {
      return res.status(400).json({ error: 'Método inválido. Use pagofacil o rapipago.' });
    }

    // Traer orden, plan y usuario
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true, user: true },
    });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.userId !== req.userId) return res.status(403).json({ error: 'No autorizado' });
    if (!['pending', 'rejected'].includes(order.status)) {
      return res.status(400).json({ error: 'La orden no permite generar cupón' });
    }

    // Crear pago TICKET en MP
    // SDK v2: mp.payment.create({ body: {...} })
const paymentResp = await mp.payment.create({
  body: {
    transaction_amount: order.priceAtMoment,
    description: `ATIX - ${order.plan.name}`,
    payment_method_id: method, // 'pagofacil' | 'rapipago'
    payer: {
      email: order.user.email,
      first_name: order.user.firstName,
      last_name: order.user.lastName,
      // identification: { type: 'DNI', number: '12345678' },
    },
    external_reference: String(order.id),
    notification_url: process.env.MP_WEBHOOK_URL, // <-- añadir
    // date_of_expiration: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), // opcional
  }
});


    // Estructura v2: muchos datos viven dentro de point_of_interaction.transaction_data
    const p = paymentResp;
    const mpPaymentId = String(p.id);
    const status = p.status; // pending (hasta que paguen en Pago Fácil)
    // URL del cupón (PDF/HTML). MP puede devolver una de estas:
    const ticketUrl =
      p?.point_of_interaction?.transaction_data?.ticket_url
      || p?.transaction_details?.external_resource_url
      || p?.point_of_interaction?.transaction_data?.qr_code_base64
      || null;

    // Guardar el pago (upsert por si reintenta)
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

    // Mantener la orden en pending (pasará a approved vía webhook cuando acrediten)
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'pending' },
    });

    // Enviar email con el cupón
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

// Página simple post-checkout
router.get('/thanks', async (req, res) => {
  res.send(`<html><body>
    <h1>Gracias por tu pago (${req.query.status})</h1>
    <p>Esperá la confirmación final. Si fue aprobado, tu plan quedará activo.</p>
    <a href="${PUBLIC_BASE_URL}">Volver</a>
  </body></html>`);
});

export default router;
