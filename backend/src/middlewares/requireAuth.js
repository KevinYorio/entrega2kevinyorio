// src/middlewares/requireAuth.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET; // clave en tu .env

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    // ✅ validación real con jsonwebtoken
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // ej: { id, email, role }
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Lo demás (requireAdmin, requireRole, etc.) queda igual


// Middleware específico: solo ADMIN
export function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === 'ADMIN') return next();
  return res.status(403).json({ error: 'Admin only' });
}

// Factory de middlewares según roles
export function requireRole(roles = []) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (roles.includes(role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// Helpers listos para usar en rutas
export const onlyAdmin    = requireRole(['ADMIN']);
export const adminOrDesk  = requireRole(['ADMIN', 'RECEPTION']); // recepción/front desk
export const adminOrCoach = requireRole(['ADMIN', 'COACH']);
