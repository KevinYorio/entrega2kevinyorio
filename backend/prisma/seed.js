// prisma/seed.ts
import { PrismaClient, Role, WeekDay, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1) Planes base (idempotente). Si no hay, los creo
  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await prisma.plan.createMany({
      data: [
        { name: 'PLAN LIBRE',              price: 5000,  sessionsPerWeek: 0 },
        { name: 'DOS VECES POR SEMANA',   price: 3000,  sessionsPerWeek: 2 },
        { name: 'ZUMBA',                   price: 2500,  sessionsPerWeek: 3 },
        { name: 'PILATES',                 price: 3000,  sessionsPerWeek: 3 },
        { name: 'PERSONALIZADO',           price: 8000,  sessionsPerWeek: 0 },
        { name: 'Mensual General',         price: 20000, sessionsPerWeek: 0 },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Planes iniciales creados');
  } else {
    console.log('ℹ️ Planes ya existen, no se crean de nuevo');
  }

  // Busco el plan "Mensual General" para usar en Membership demo
  const planMensual = await prisma.plan.findFirst({
    where: { name: 'Mensual General' },
  });
  if (!planMensual) {
    throw new Error('No encontré el plan "Mensual General". Verifica seed de planes.');
  }

  // 2) Usuarios base (ADMIN y ALUMNO). Se crean con passwordHash
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@atix.com' },
    update: {},
    create: {
      email: 'admin@atix.com',
      passwordHash: adminPass,
      firstName: 'Admin',
      lastName: 'ATIX',
      role: Role.ADMIN,
      emailVerified: true,
      active: true,
    },
  });

  const alumnoPass = await bcrypt.hash('alumno123', 10);
  const alumno = await prisma.user.upsert({
    where: { email: 'alumno@atix.com' },
    update: {},
    create: {
      email: 'alumno@atix.com',
      passwordHash: alumnoPass,
      firstName: 'Kevin',
      lastName: 'Alumno',
      role: Role.USER,
      active: true,
    },
  });

  // 3) Membership activo para el alumno (en lugar de user.planId)
  const now = new Date();
  const ends = new Date(now);
  ends.setMonth(ends.getMonth() + 1);
  await prisma.membership.upsert({
    where: {
      // unique compuesto no existe por defecto; usamos un upsert “manual”:
      // estrategia: si existe una membership ACTIVA que abarque hoy, no crear otra.
      // Para simplificar idempotencia, Intentamos encontrar una activa primero.
      // Prisma exige 'where' único en upsert, así que hacemos un findFirst arriba.
      // ↓ Por eso reemplazamos upsert por find + create:
      // (truco: no romper; ver implementacion abajo)
      id: -1,
    },
    update: {},
    create: {
      userId: alumno.id,
      planId: planMensual.id,
      startsAt: now,
      endsAt: ends,
      status: 'active',
    },
  }).catch(async () => {
    const existingActive = await prisma.membership.findFirst({
      where: {
        userId: alumno.id,
        status: 'active',
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
    if (!existingActive) {
      await prisma.membership.create({
        data: {
          userId: alumno.id,
          planId: planMensual.id,
          startsAt: now,
          endsAt: ends,
          status: 'active',
        },
      });
    }
  });

  // 4) Empleado (Coach) y Clase demo
  const coach = await prisma.employee.upsert({
    where: { email: 'coach@atix.local' },
    update: {},
    create: {
      firstName: 'Alexis',
      lastName: 'Profe',
      email: 'coach@atix.local',
      role: Role.COACH,
      hourRate: new Prisma.Decimal(3000),
      active: true,
    },
  });

  await prisma.class.upsert({
    where: { id: 1 }, // clave arbitraria para idempotencia del demo
    update: {},
    create: {
      id: 1,
      name: 'Funcional',
      day: WeekDay.MON,
      startTime: '18:00',
      endTime: '19:00',
      capacity: 20,
      coachId: coach.id,
    },
  });

  // 5) Reserva demo del alumno para esa clase, con QR token
  const booking = await prisma.booking.create({
    data: {
      date: new Date(), // hoy
      time: '18:00',
      status: 'CONFIRMED',
      classId: 1,
      studentId: alumno.id,
      checkInToken: 'DEMO-TOKEN-123', // para probar /checkin/:token
    },
  });

  console.log('✅ Seed OK', {
    admin: admin.email,
    alumno: alumno.email,
    bookingId: booking.id,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
