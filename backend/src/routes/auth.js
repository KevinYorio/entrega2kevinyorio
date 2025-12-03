// src/routes/auth.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const {
  JWT_SECRET = 'dev-secret',
  ACCESS_TOKEN_TTL = '2h',       // 2 horas por defecto
  REFRESH_TOKEN_TTL_DAYS = '30', // 30 días por defecto
} = process.env;

/* =====================
 * Helpers de tokens
 * ===================== */

// Access token “rico”: incluye id, email y role (además del claim estándar sub)
function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

// Refresh token opaco
function generateRefreshTokenRaw() {
  return crypto.randomBytes(64).toString('hex');
}
async function storeRefreshToken(userId, raw) {
  const tokenHash = await argon2.hash(raw);
  const rt = await prisma.refreshToken.create({ data: { userId, tokenHash } });
  return { raw, id: rt.id };
}
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
    const payload = jwt.verify(token, JWT_SECRET);
    // Compatibilidad: si solo viene sub, levantamos minimalmente el user
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
  return !!m;
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
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'email already used' });

  const passwordHash = await argon2.hash(password);
  // role por defecto es USER (según tu schema)
  const created = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  const accessToken = signAccessToken(created);
  const { raw: refreshRaw } = await storeRefreshToken(created.id, generateRefreshTokenRaw());

  // cookie HttpOnly con refresh
  res.cookie('rt', refreshRaw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // true si usás HTTPS en prod
    maxAge: parseInt(REFRESH_TOKEN_TTL_DAYS, 10) * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  res.json({ ok: true, token: accessToken, user: created });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, passwordHash: true },
  });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const accessToken = signAccessToken(user);
  const { raw: refreshRaw } = await storeRefreshToken(user.id, generateRefreshTokenRaw());

  res.cookie('rt', refreshRaw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // true si HTTPS en prod
    maxAge: parseInt(REFRESH_TOKEN_TTL_DAYS, 10) * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  const planActive = await hasActivePlan(user.id);

  res.json({
    ok: true,
    token: accessToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,      // <= importante para el front
      planActive,
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  // Si el token “viejo” traía solo sub, todavía resolvemos desde DB
  const id = req.user?.id ?? req.userId;
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

  const tokens = await prisma.refreshToken.findMany({ where: { revoked: false } });
  let found = null;
  for (const t of tokens) {
    if (await argon2.verify(t.tokenHash, raw)) { found = t; break; }
  }
  if (!found) return res.status(401).json({ error: 'invalid refresh' });

  // Rotación
  await revokeRefreshToken(found.id);
  const { raw: newRaw } = await storeRefreshToken(found.userId, generateRefreshTokenRaw());
  res.cookie('rt', newRaw, {
    httpOnly: true, sameSite: 'lax', secure: false,
    maxAge: parseInt(REFRESH_TOKEN_TTL_DAYS, 10) * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  // Para el nuevo access token, necesitamos role/email → buscamos al user
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
  if (raw) {
    const tokens = await prisma.refreshToken.findMany({ where: { revoked: false } });
    for (const t of tokens) {
      if (await argon2.verify(t.tokenHash, raw)) await revokeRefreshToken(t.id);
    }
  }
  res.clearCookie('rt', { path: '/api/auth' });
  res.json({ ok: true });
});

export default router;
