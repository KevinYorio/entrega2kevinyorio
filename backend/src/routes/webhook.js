// src/routes/webhook.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { initMP } from '../mp.js';

const prisma = new PrismaClient();
const router = Router();
const mp = initMP();

router.post('/mercadopago/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    let paymentId = data?.id || req.query['data.id'];

    if (!paymentId && req.query.type === 'payment') {
      paymentId = req.query.id;
    }
    if (!paymentId) {
      return res.status(200).json({ received: true });
    }

    // SDK v2: payment.get({ id })
    const payment = await mp.payment.get({ id: paymentId });

    const external_reference = payment.external_reference; // orderId
    const status = payment.status;                         // approved, pending, rejected...
    const method = payment.payment_method?.type || payment.payment_type_id || null;
    const amount = Math.round(payment.transaction_amount || 0);

    const orderId = parseInt(external_reference, 10);
    if (!Number.isInteger(orderId)) {
      return res.status(200).json({ ok: true });
    }

    // Upsert pago
    await prisma.payment.upsert({
      where: { mpPaymentId: String(paymentId) },
      create: {
        orderId,
        mpPaymentId: String(paymentId),
        status,
        method,
        amount,
        detailsJson: JSON.stringify(payment),
      },
      update: {
        status,
        method,
        amount,
        detailsJson: JSON.stringify(payment),
      },
    });

    // Actualizar estado orden + membresía
    if (status === 'approved') {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'approved' } });

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      const starts = new Date();
      const ends = new Date();
      ends.setDate(starts.getDate() + 30);

      await prisma.membership.create({
        data: {
          userId: order.userId,
          planId: order.planId,
          startsAt: starts,
          endsAt: ends,
          status: 'active',
        }
      });
    } else if (status === 'rejected') {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'rejected' } });
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { status } });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(200).json({ ok: true });
  }
});

export default router;
