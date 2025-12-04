// src/server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config(); 
// Carga las variables de entorno del archivo .env antes de inicializar nada.

// Rutas
import authRoutes from './routes/auth.js';
import planRoutes from './routes/plans.js';
import orderRoutes from './routes/orders.js';
import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js'; // <- tu ERP admin

// src/server.js
import { requireAuth, adminOrDesk } from './middlewares/requireAuth.js';
// Middleware de autenticación y control de roles.

import employeeRoutes from './routes/employees.js'; // CRUD de empleados

const app = express();

/* ─────────────────────────────────────────────
 * CORS
 * ───────────────────────────────────────────── */
const {
  WEB_PUBLIC_URL, // URL del frontend, ej: http://localhost:5173
  API_PUBLIC_URL  // URL pública del backend
} = process.env;

// DEBUG (opcional)
app.use((req, _res, next) => {
  // Log de cada request para debug de CORS en desarrollo.
  console.log('[CORS check]', req.method, req.url, 'Origin:', req.headers.origin || '(none)');
  next();
});

// Whitelist básico + localhost
const ALLOWED = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://172.27.80.1:5173', // IP típica de Vite en modo LAN
  WEB_PUBLIC_URL,           // dominio real del frontend
  API_PUBLIC_URL,           // dominio real del backend
  'null',                   // cuando se accede desde file://
  undefined,                // Postman/cURL no envían Origin
]);

app.use(cors({
  origin(origin, cb) {
    // Si en desarrollo no configuraste WEB_PUBLIC_URL, se permite todo.
    if (!WEB_PUBLIC_URL) return cb(null, true);

    // Si el origin está permitido explícitamente, aceptamos.
    if (ALLOWED.has(origin)) return cb(null, true);

    // Permitir cualquier localhost:* aunque cambie el puerto
    if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }

    // Si no cumple ninguna regla, se bloquea.
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true, // permite enviar cookies/sesiones
}));


/* ─────────────────────────────────────────────
 * Middlewares comunes
 * ───────────────────────────────────────────── */
app.use(express.json());       // interpretar JSON del body
app.use(cookieParser());       // leer cookies (auth, session tokens)


/* ─────────────────────────────────────────────
 * Healthchecks
 * ───────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ ok: true }));
// Endpoint para verificar rápidamente que el servidor funciona.

app.get('/api/auth/health', (_req, res) => res.json({ ok: true }));
// Health específico del módulo de autenticación.

app.get('/api/cors-check', (req, res) => {
  // Muestra qué Origin llegó y confirma que CORS está operativo.
  res.json({ ok: true, origin: req.headers.origin || null });
});


/* ─────────────────────────────────────────────
 * Rutas API
 * ───────────────────────────────────────────── */
app.use('/api/auth', authRoutes);       // login, logout, sesiones, registros
app.use('/api/plans', planRoutes);      // obtención de planes activos
app.use('/api/orders', orderRoutes);    // creación y consulta de órdenes MP
app.use('/api', webhookRoutes);         // /api/mercadopago/webhook
app.use('/api', adminRoutes);           // ERP interno (admin)
app.use('/api/employees', requireAuth, adminOrDesk, employeeRoutes);
// CRUD de empleados, solo accesible para ADMIN o RECEPCION.


/* ─────────────────────────────────────────────
 * Errores no atrapados (para no crashear)
 * ───────────────────────────────────────────── */
process.on('unhandledRejection', (reason) => {
  // Maneja promesas rechazadas sin catch para evitar caída del servidor.
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  // Maneja errores fatales no controlados.
  console.error('UNCAUGHT EXCEPTION:', err);
});


/* ─────────────────────────────────────────────
 * Listen
 * ───────────────────────────────────────────── */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // Mensajes de arranque del servidor
  console.log(`API ATIX escuchando en http://localhost:${PORT}`);
  console.log('WEB_PUBLIC_URL:', WEB_PUBLIC_URL);
  console.log('API_PUBLIC_URL:', API_PUBLIC_URL);
});
