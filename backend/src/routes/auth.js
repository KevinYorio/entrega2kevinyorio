// src/routes/auth.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

// Instancia de Prisma para manejar BD
const prisma = new PrismaClient();
const router = Router();

// Variables de entorno con fallback por defecto
const {
  JWT_SECRET = 'dev-secret',            // Clave para firmar los JWT
  ACCESS_TOKEN_TTL = '2h',              // Duración del access token
  REFRESH_TOKEN_TTL_DAYS = '30',        // Duración del refresh token
} = process.env;

/* =====================
 * Helpers de tokens
 * ===================== */

// Crea un access token JWT que incluye los datos principales del usuario.
// Se usa para autenticar rutas y aplicar permisos por rol.
function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

// Genera refresh token opaco (no contiene info del usuario).
// Luego será hasheado antes de guardarse en BD.
function generateRefreshTokenRaw() {
  return crypto.randomBytes(64).toString('hex');
}

// Guarda en la BD el refresh token hashed con argon2.
// Se almacena el hash, no el token real.
async function storeRefreshToken(userId, raw) {
  const tokenHash = await argon2.hash(raw);
  const rt = await prisma.refreshToken.create({ data: { userId, tokenHash } });
  return { raw, id: rt.id };
}

// Marca un refresh token como revocado para evitar reutilización.
async function revokeRefreshToken(id) {
  await prisma.refreshToken.update({ where: { id }, data: { revoked: true } });
}

/* =====================
 * Middleware auth (para /me y para compat)
 * ===================== */
export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });

  try {
    // Verificación del JWT con la clave secreta
    const payload = jwt.verify(token, JWT_SECRET);

    // Compatibilidad con versiones anteriores:
    // si el token no incluía email/role, levantamos lo mínimo posible.
    if (!payload.role || !payload.email) {
      req.user = { id: Number(payload.sub || payload.id) };
    } else {
      req.user = { id: payload.id, email: payload.email, role: payload.role };
    }
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/* =====================
 * Lógica de plan activo (opcional)
 * ===================== */
// Verifica si el usuario tiene un plan vigente en este momento.
async function hasActivePlan(userId) {
  const now = new Date();
  const m = await prisma.membership.findFirst({
    where: {
      userId,
      status: 'active',
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
  });
  return !!m; // devuelve true/false
}

/* =====================
 * Rutas
 * ===================== */

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {};
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'missing fields' });
  }

  // Verificar si ya existe un usuario con ese email
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'email already used' });

  // Hash del password del usuario
  const passwordHash = await argon2.hash(password);

  // Crea usuario con rol por defecto "USER"
  const created = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  // Generación del access token
  const accessToken = signAccessToken(created);

  // Generación y guardado del refresh token
  const { raw: refreshRaw } = await storeRefreshToken(created.id, generateRefreshTokenRaw());

  // Envio del refresh token como cookie HttpOnly
  res.cookie('rt', refreshRaw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // En prod debe ser true con HTTPS
    maxAge: parseInt(REFRESH_TOKEN_TTL_DAYS, 10) * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  res.json({ ok: true, token: accessToken, user: created });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });

  // Buscar usuario por email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, passwordHash: true },
  });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  // Validar password ingresado con el hash guardado
  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  // Generar access token JWT
  const accessToken = signAccessToken(user);

  // Crear refresh token
  const { raw: refreshRaw } = await storeRefreshToken(user.id, generateRefreshTokenRaw());

  // Enviar refresh token en cookie HttpOnly
  res.cookie('rt', refreshRaw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // Cambiar a true si HTTPS
    maxAge: parseInt(REFRESH_TOKEN_TTL_DAYS, 10) * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  // Verificar si el usuario tiene un plan activo
  const planActive = await hasActivePlan(user.id);

  res.json({
    ok: true,
    token: accessToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      planActive,
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  // Compatibilidad: algunos tokens antiguos solo traen sub.
  const id = req.user?.id ?? req.userId;

  // Buscar datos actualizados del usuario
  const user = await prisma.user.findUnique({
    where: { id: id },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });
  if (!user) return res.status(404).json({ error: 'not found' });

  const planActive = await hasActivePlan(user.id);
  res.json({ ...user, planActive });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.rt;
  if (!raw) return res.status(401).json({ error: 'missing refresh token' });

  // Buscar tokens válidos y no revocados
  const tokens = await prisma.refreshToken.findMany({ where: { revoked: false } });

  // Verificar cuál token hasheado coincide
  let found = null;
  for (const t of tokens) {
    if (await argon2.verify(t.tokenHash, raw)) { found = t; break; }
  }
  if (!found) return res.status(401).json({ error: 'invalid refresh' });

  // Rotar el token → revocar el viejo y emitir uno nuevo
  await revokeRefreshToken(found.id);

  const { raw: newRaw } = await storeRefreshToken(found.userId, generateRefreshTokenRaw());
  res.cookie('rt', newRaw, {
    httpOnly: true, sameSite: 'lax', secure: false,
    maxAge: parseInt(REFRESH_TOKEN_TTL_DAYS, 10) * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  // Para crear el nuevo access token necesitamos email/role → buscamos usuario
  const u = await prisma.user.findUnique({
    where: { id: found.userId },
    select: { id: true, email: true, role: true },
  });
  if (!u) return res.status(404).json({ error: 'user not found' });

  const accessToken = signAccessToken(u);
  res.json({ ok: true, token: accessToken });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const raw = req.cookies?.rt;

  // Revocar refresh tokens asociados al raw
  if (raw) {
    const tokens = await prisma.refreshToken.findMany({ where: { revoked: false } });
    for (const t of tokens) {
      if (await argon2.verify(t.tokenHash, raw)) await revokeRefreshToken(t.id);
    }
  }

  // Limpiar cookie del client
  res.clearCookie('rt', { path: '/api/auth' });
  res.json({ ok: true });
});

export default router;
