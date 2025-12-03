// /src/routes/employees.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';

const r = Router();

// Normaliza payload del frontend -> DB
function normalizeEmployeeBody(body) {
  const firstName = (body.firstName || '').trim();
  const lastName  = (body.lastName  || '').trim() || null;
  const emailRaw  = (body.email     || '').trim();
  const email     = emailRaw === '' ? null : emailRaw;
  const role      = (body.role      || 'COACH').toUpperCase();
  const hourRate  = body.hourRate === null || body.hourRate === undefined || body.hourRate === ''
    ? null
    : Number(body.hourRate);

  return { firstName, lastName, email, role, hourRate };
}

function validateEmployee({ firstName, role }) {
  if (!firstName) return 'El nombre es obligatorio';
  const allowed = ['ADMIN','RECEPTION','COACH'];
  if (!allowed.includes(role)) return 'Rol inválido (ADMIN | RECEPTION | COACH)';
  return null;
}

// GET /api/employees
r.get('/', async (_req, res) => {
  const items = await prisma.employee.findMany({
    orderBy: [{ createdAt: 'desc' }],
  });
  // Prisma Decimal serializa a string; frontend lo maneja ok
  res.json(items);
});

// POST /api/employees
r.post('/', async (req, res) => {
  const data = normalizeEmployeeBody(req.body);
  const err = validateEmployee(data);
  if (err) return res.status(400).json({ error: err });

  try {
    const created = await prisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,     // unique nullable
        role:      data.role,      // Role enum
        hourRate:  data.hourRate,  // Decimal | null
        active:    true,
      },
    });
    res.status(201).json(created);
  } catch (e) {
    // Manejo de unique(email)
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado en otro empleado' });
    }
    console.error('POST /employees error', e);
    res.status(500).json({ error: 'Error creando empleado' });
  }
});

// PUT /api/employees/:id
r.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

  const data = normalizeEmployeeBody(req.body);
  const err = validateEmployee(data);
  if (err) return res.status(400).json({ error: err });

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        role:      data.role,
        hourRate:  data.hourRate,
      },
    });
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado en otro empleado' });
    }
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    console.error('PUT /employees/:id error', e);
    res.status(500).json({ error: 'Error actualizando empleado' });
  }
});

// DELETE /api/employees/:id
r.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

  try {
    await prisma.employee.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Empleado no encontrado' });
    console.error('DELETE /employees/:id error', e);
    res.status(500).json({ error: 'Error eliminando empleado' });
  }
});

export default r;
