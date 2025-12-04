// src/middlewares/requireAuth.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET; // clave en tu .env

export function requireAuth(req, res, next) {
  // Obtiene el header Authorization o un string vacío si no existe
  const h = req.headers.authorization || '';
  
  // Extrae el token solo si el header comienza con "Bearer "
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;

  // Si no hay token, se bloquea el acceso
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    // ✅ validación real con jsonwebtoken
    // Verifica firma y contenido del token usando la clave secreta
    const payload = jwt.verify(token, SECRET);

    // Guarda la información del usuario autenticado en la request
    // Por ejemplo: { id, email, role }
    req.user = payload;

    // Pasa el control a la siguiente función/middleware
    return next();
  } catch (e) {
    // Si el token es inválido o expiró
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Lo demás (requireAdmin, requireRole, etc.) queda igual


// Middleware específico: solo ADMIN
export function requireAdmin(req, res, next) {
  // Toma el rol que se guardó en req.user dentro de requireAuth
  const role = req.user?.role;

  // Si es ADMIN, se permite avanzar
  if (role === 'ADMIN') return next();

  // Si no tiene permiso, se responde con error 403 (prohibido)
  return res.status(403).json({ error: 'Admin only' });
}

// Factory de middlewares según roles
export function requireRole(roles = []) {
  // Devuelve un middleware que valida si el rol está permitido
  return (req, res, next) => {
    const role = req.user?.role;

    // Si el rol está dentro del array permitido
    if (roles.includes(role)) return next();

    // Si no, se bloquea con 403
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// Helpers listos para usar en rutas
export const onlyAdmin    = requireRole(['ADMIN']);
export const adminOrDesk  = requireRole(['ADMIN', 'RECEPTION']); // recepción/front desk
export const adminOrCoach = requireRole(['ADMIN', 'COACH']);
