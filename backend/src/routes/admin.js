// src/routes/admin.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middlewares/requireAuth.js';

const prisma = new PrismaClient();
const router = Router();

// ─────────────────────────────────────────────
// Roles / permisos
const onlyAdmin    = requireRole(['ADMIN']);
const adminOrDesk  = requireRole(['ADMIN', 'RECEPTION']); // recepción/front desk
const adminOrCoach = requireRole(['ADMIN', 'COACH']);     // coach puede hacer check-in

// ─────────────────────────────────────────────
// Utils fechas
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// WeekDay de tu enum (sin domingo)
const WEEKDAY_ENUM = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function todayWeekdayEnum() {
  const jsDay = new Date().getDay(); // 0..6 (0 = domingo)
  if (jsDay === 0) return null; // Domingo no existe en enum
  return WEEKDAY_ENUM[jsDay - 1];
}

// ─────────────────────────────────────────────
// KPIs
router.get('/admin/kpis', requireAuth, onlyAdmin, async (_req, res) => {
  const [activeStudents, monthIncomeAgg, classesTodayCount, todayBookingsCount] = await Promise.all([
    prisma.user.count({ where: { active: true, role: 'USER' } }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { date: { gte: startOfMonth() }, status: 'PAID' }
    }),
    prisma.class.count({ where: { day: todayWeekdayEnum() || undefined } }),
    prisma.booking.count({ where: { date: { gte: startOfToday(), lt: endOfToday() } } }),
  ]);

  const monthIncome = Number(monthIncomeAgg._sum.total || 0);

  res.json({
    activeStudents,
    monthIncome,
    classesToday: classesTodayCount,
    bookings: todayBookingsCount,
  });
});

// ─────────────────────────────────────────────
// Users (admin)
router.get('/admin/users', requireAuth, onlyAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    orderBy: { id: 'desc' },
  });
  res.json(users);
});

// ─────────────────────────────────────────────
// Students (alumnos) — solo ADMIN
router.get('/students', requireAuth, onlyAdmin, async (req, res) => {
  const { q, status } = req.query;

  const where = {
    role: 'USER',
    ...(status ? { active: status === 'active' } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { email:     { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const items = await prisma.user.findMany({
    where,
    orderBy: { id: 'desc' },
  });

  res.json({ items });
});

router.post('/students', requireAuth, onlyAdmin, async (req, res) => {
  const { firstName, lastName, email, phone, status = 'active' } = req.body;
  const user = await prisma.user.create({
    data: { firstName, lastName, email, phone, active: status === 'active', role: 'USER' },
  });
  res.json(user);
});

router.put('/students/:id', requireAuth, onlyAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { firstName, lastName, email, phone, status = 'active' } = req.body;
  const user = await prisma.user.update({
    where: { id },
    data: { firstName, lastName, email, phone, active: status === 'active' },
  });
  res.json(user);
});

router.delete('/students/:id', requireAuth, onlyAdmin, async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.sendStatus(204);
});

// ─────────────────────────────────────────────
// Providers / Expenses — solo ADMIN
router.get('/providers', requireAuth, onlyAdmin, async (_req, res) => {
  const prov = await prisma.provider.findMany({ orderBy: { id: 'desc' } });
  const withLast = await Promise.all(
    prov.map(async (p) => {
      const last = await prisma.expense.findFirst({
        where: { providerId: p.id },
        orderBy: { id: 'desc' },
      });
      return { ...p, lastExpense: last ? { ...last, amount: Number(last.amount) } : null };
    })
  );
  res.json({ items: withLast });
});

router.post('/providers', requireAuth, onlyAdmin, async (req, res) => {
  const p = await prisma.provider.create({ data: req.body });
  res.json(p);
});

router.put('/providers/:id', requireAuth, onlyAdmin, async (req, res) => {
  const p = await prisma.provider.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json(p);
});

router.delete('/providers/:id', requireAuth, onlyAdmin, async (req, res) => {
  await prisma.provider.delete({ where: { id: Number(req.params.id) } });
  res.sendStatus(204);
});

router.post('/providers/:id/expenses', requireAuth, onlyAdmin, async (req, res) => {
  const { concept, amount, date } = req.body;
  const exp = await prisma.expense.create({
    data: {
      providerId: Number(req.params.id),
      concept,
      amount, // Decimal(10,2) — number o string
      date: date ? new Date(date) : undefined,
    },
  });
  res.json(exp);
});

// ─────────────────────────────────────────────
// Employees — solo ADMIN
router.get('/employees', requireAuth, onlyAdmin, async (req, res) => {
  const { role } = req.query;
  const where = role ? { role } : {};
  const list = await prisma.employee.findMany({ where, orderBy: { id: 'desc' } });
  res.json(list);
});

router.post('/employees', requireAuth, onlyAdmin, async (req, res) => {
  const emp = await prisma.employee.create({ data: req.body });
  res.json(emp);
});

router.put('/employees/:id', requireAuth, onlyAdmin, async (req, res) => {
  const emp = await prisma.employee.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json(emp);
});

router.delete('/employees/:id', requireAuth, onlyAdmin, async (req, res) => {
  await prisma.employee.delete({ where: { id: Number(req.params.id) } });
  res.sendStatus(204);
});

// ─────────────────────────────────────────────
// Classes (admin o recepción para leer; mutate solo admin)
router.get('/classes', requireAuth, adminOrDesk, async (_req, res) => {
  const classes = await prisma.class.findMany({
    include: { coach: true },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
  });
  res.json(classes);
});

router.get('/classes/today', requireAuth, adminOrDesk, async (_req, res) => {
  const weekday = todayWeekdayEnum();
  if (!weekday) return res.json({ total: 0, bookings: 0, classes: [] }); // domingo

  const classes = await prisma.class.findMany({
    where: { day: weekday },
    orderBy: { startTime: 'asc' },
  });
  const bookings = await prisma.booking.count({
    where: { date: { gte: startOfToday(), lt: endOfToday() } },
  });
  res.json({ total: classes.length, bookings, classes });
});

router.post('/classes', requireAuth, onlyAdmin, async (req, res) => {
  const created = await prisma.class.create({ data: req.body });
  res.json(created);
});

router.put('/classes/:id', requireAuth, onlyAdmin, async (req, res) => {
  const updated = await prisma.class.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json(updated);
});

router.delete('/classes/:id', requireAuth, onlyAdmin, async (req, res) => {
  await prisma.class.delete({ where: { id: Number(req.params.id) } });
  res.sendStatus(204);
});

// ─────────────────────────────────────────────
// Bookings (lectura admin o recepción; mutate solo admin)
router.get('/bookings', requireAuth, adminOrDesk, async (req, res) => {
  const { date } = req.query;
  const where = date
    ? { date: { gte: new Date(`${date}T00:00:00`), lt: new Date(`${date}T23:59:59.999`) } }
    : {};

  const items = await prisma.booking.findMany({
    where,
    include: { class: true, student: true },
    orderBy: { id: 'desc' },
  });

  res.json({
    items: items.map((b) => ({
      id: b.id,
      date: b.date,
      time: b.time,
      status: b.status,
      checkedIn: b.checkedIn,
      checkInAt: b.checkInAt,
      className: b.class?.name || null,
      studentName: `${b.student?.firstName || ''} ${b.student?.lastName || ''}`.trim(),
    })),
  });
});

router.post('/bookings/:id/confirm', requireAuth, onlyAdmin, async (req, res) => {
  const upd = await prisma.booking.update({ where: { id: Number(req.params.id) }, data: { status: 'CONFIRMED' } });
  res.json(upd);
});

router.post('/bookings/:id/cancel', requireAuth, onlyAdmin, async (req, res) => {
  const upd = await prisma.booking.update({ where: { id: Number(req.params.id) }, data: { status: 'CANCELLED' } });
  res.json(upd);
});

// ─────────────────────────────────────────────
// Invoices — solo ADMIN
router.get('/invoices', requireAuth, onlyAdmin, async (req, res) => {
  const { q, status, limit = '100' } = req.query;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            ...(isNaN(Number(q)) ? [] : [{ number: Number(q) }]),
            {
              student: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName:  { contains: q, mode: 'insensitive' } },
                  { email:     { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const list = await prisma.invoice.findMany({
    where,
    take: parseInt(String(limit), 10),
    include: { student: true },
    orderBy: { id: 'desc' },
  });

  res.json({
    items: list.map((i) => ({
      id: i.id,
      number: i.number,
      date: i.date,
      total: Number(i.total),
      status: i.status,
      studentName: `${i.student?.firstName || ''} ${i.student?.lastName || ''}`.trim(),
    })),
  });
});

router.post('/invoices', requireAuth, onlyAdmin, async (req, res) => {
  const { studentId, date, status = 'PENDING', items = [] } = req.body;

  const total = items.reduce((acc, it) => acc + Number(it.qty) * Number(it.price), 0);
  const lastNum = (await prisma.invoice.aggregate({ _max: { number: true } }))._max.number || 0;

  const inv = await prisma.invoice.create({
    data: {
      studentId,
      date: date ? new Date(date) : undefined,
      status,
      total,
      number: lastNum + 1,
      items: {
        create: items.map((i) => ({
          description: i.description,
          qty: Number(i.qty),
          price: i.price, // Decimal(10,2)
        })),
      },
    },
    include: { items: true },
  });

  res.json(inv);
});

router.post('/invoices/:id/pay', requireAuth, onlyAdmin, async (req, res) => {
  const inv = await prisma.invoice.update({ where: { id: Number(req.params.id) }, data: { status: 'PAID' } });
  res.json(inv);
});

router.post('/invoices/:id/cancel', requireAuth, onlyAdmin, async (req, res) => {
  const inv = await prisma.invoice.update({ where: { id: Number(req.params.id) }, data: { status: 'CANCELLED' } });
  res.json(inv);
});

// Generación mensual: facturas para memberships activas
router.post('/invoices/generate-month', requireAuth, onlyAdmin, async (_req, res) => {
  const now = new Date();

  const actives = await prisma.membership.findMany({
    where: { status: 'active', startsAt: { lte: now }, endsAt: { gt: now } },
    include: { user: true, plan: true },
  });

  let number = (await prisma.invoice.aggregate({ _max: { number: true } }))._max.number || 0;
  let created = 0;

  for (const m of actives) {
    number += 1;
    const planPrice = m.plan ? m.plan.price : 0;

    await prisma.invoice.create({
      data: {
        studentId: m.userId,
        date: now,
        status: 'PENDING',
        number,
        total: planPrice,
        items: m.plan
          ? { create: [{ description: `Plan ${m.plan.name}`, qty: 1, price: planPrice }] }
          : undefined,
      },
    });
    created++;
  }

  res.json({ created });
});

// ─────────────────────────────────────────────
// 3.1 Reportes Ingresos/Gastos por rango (admin o recepción)
router.get('/reports/income-expenses', requireAuth, adminOrDesk, async (req, res) => {
  const { from, to } = req.query;
  const gte = from ? new Date(`${from}T00:00:00`) : startOfMonth();
  const lt  = to   ? new Date(`${to}T23:59:59.999`) : new Date();

  const [paidAgg, pendAgg, expensesAgg, invoices, expenses] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: 'PAID',    date: { gte, lt } } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: 'PENDING', date: { gte, lt } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte, lt } } }),
    prisma.invoice.findMany({ where: { date: { gte, lt } }, include: { student: true }, orderBy: { date: 'desc' } }),
    prisma.expense.findMany({ where: { date: { gte, lt } }, include: { provider: true }, orderBy: { date: 'desc' } }),
  ]);

  res.json({
    range: { from: gte, to: lt },
    totals: {
      income_paid: Number(paidAgg._sum.total || 0),
      income_pending: Number(pendAgg._sum.total || 0),
      expenses: Number(expensesAgg._sum.amount || 0),
      balance: Number((paidAgg._sum.total || 0) - (expensesAgg._sum.amount || 0)),
    },
    invoices: invoices.map(i => ({
      id: i.id, number: i.number, date: i.date, status: i.status, total: Number(i.total),
      student: `${i.student?.firstName || ''} ${i.student?.lastName || ''}`.trim(),
    })),
    expenses: expenses.map(e => ({
      id: e.id, concept: e.concept, amount: Number(e.amount), date: e.date, provider: e.provider?.name || '-',
    })),
  });
});

// ─────────────────────────────────────────────
// 3.2 Check-in por QR/turno
// Generar token QR para una reserva (ADMIN o RECEPCIÓN)
router.post('/bookings/:id/qrcode', requireAuth, adminOrDesk, async (req, res) => {
  const id = Number(req.params.id);
  const token = crypto.randomBytes(6).toString('base64url').slice(0, 10); // 10 chars
  await prisma.booking.update({ where: { id }, data: { checkInToken: token } });
  res.json({ token });
});

// Check-in por token (ADMIN o COACH)
router.post('/checkin/:token', requireAuth, adminOrCoach, async (req, res) => {
  const token = req.params.token;
  const bk = await prisma.booking.findUnique({
    where: { checkInToken: token },
    include: { student: true, class: true },
  });
  if (!bk) return res.status(404).json({ error: 'Token no encontrado' });
  if (bk.checkedIn) return res.json({ ok: true, already: true, id: bk.id });

  const done = await prisma.booking.update({
    where: { id: bk.id },
    data: { checkedIn: true, checkInAt: new Date() },
  });
  res.json({ ok: true, id: done.id, student: bk.student?.firstName, class: bk.class?.name, at: done.checkInAt });
});

// Check-in manual por ID (ADMIN o RECEPCIÓN)
router.post('/bookings/:id/checkin', requireAuth, adminOrDesk, async (req, res) => {
  const id = Number(req.params.id);
  const bk = await prisma.booking.update({
    where: { id },
    data: { checkedIn: true, checkInAt: new Date() },
  });
  res.json({ ok: true, id: bk.id, at: bk.checkInAt });
});

// ─────────────────────────────────────────────
// 3.3 Exportar CSV genérico (admin o recepción)
function toCSV(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v => (v == null ? '' : String(v).replace(/"/g, '""'));
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => `"${esc(r[h])}"`).join(','));
  }
  return lines.join('\n');
}

router.get('/export/:entity.csv', requireAuth, adminOrDesk, async (req, res) => {
  const { entity } = req.params;
  let rows = [];

  if (entity === 'students') {
    // Buscamos membership ACTIVA para mostrar el plan (si hay)
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        memberships: {
          where: {
            status: 'active',
            startsAt: { lte: new Date() },
            endsAt: { gt: new Date() },
          },
          include: { plan: true },
        },
      },
      orderBy: { id: 'desc' },
    });
    rows = users.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName || '',
      email: u.email,
      phone: u.phone || '',
      active: u.active ? 'yes' : 'no',
      plan: u.memberships[0]?.plan?.name || '', // primer membership activo
    }));
  } else if (entity === 'providers') {
    const list = await prisma.provider.findMany();
    rows = list.map(p => ({
      id: p.id, name: p.name, contact: p.contact || '', email: p.email || '', phone: p.phone || ''
    }));
  } else if (entity === 'employees') {
    const list = await prisma.employee.findMany();
    rows = list.map(e => ({
      id: e.id, firstName: e.firstName, lastName: e.lastName || '', email: e.email || '', role: e.role, hourRate: e.hourRate ?? ''
    }));
  } else if (entity === 'invoices') {
    const list = await prisma.invoice.findMany({ include: { student: true } });
    rows = list.map(i => ({
      id: i.id, number: i.number ?? '', date: i.date.toISOString(), status: i.status,
      total: Number(i.total), student: `${i.student?.firstName || ''} ${i.student?.lastName || ''}`.trim()
    }));
  } else if (entity === 'expenses') {
    const list = await prisma.expense.findMany({ include: { provider: true } });
    rows = list.map(e => ({
      id: e.id, date: e.date.toISOString(), concept: e.concept, amount: Number(e.amount), provider: e.provider?.name || ''
    }));
  } else if (entity === 'bookings') {
    const list = await prisma.booking.findMany({ include: { student: true, class: true } });
    rows = list.map(b => ({
      id: b.id,
      date: b.date.toISOString(),
      time: b.time || '',
      status: b.status,
      student: `${b.student?.firstName || ''} ${b.student?.lastName || ''}`.trim(),
      class: b.class?.name || '',
      checkedIn: b.checkedIn ? 'yes' : 'no',
      checkInAt: b.checkInAt ? b.checkInAt.toISOString() : '',
      checkInToken: b.checkInToken || ''
    }));
  } else {
    return res.status(400).json({ error: 'Entidad no soportada' });
  }

  const csv = toCSV(rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
  res.send(csv);
});

// ─────────────────────────────────────────────
// Health admin
router.get('/admin/health', requireAuth, onlyAdmin, (_req, res) => {
  res.json({ ok: true, area: 'admin' });
});

export default router;
