// src/server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

// Rutas
import authRoutes from './routes/auth.js';
import planRoutes from './routes/plans.js';
import orderRoutes from './routes/orders.js';
import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js'; // <- tu ERP admin

// src/server.js
import { requireAuth, adminOrDesk } from './middlewares/requireAuth.js';
import employeeRoutes from './routes/employees.js'; // 

const app = express();

/* ─────────────────────────────────────────────
 * CORS
 * ───────────────────────────────────────────── */
const {
  WEB_PUBLIC_URL, // ej: http://localhost:5173
  API_PUBLIC_URL  // ej: http://localhost:4000
} = process.env;

// DEBUG (opcional)
app.use((req, _res, next) => {
  console.log('[CORS check]', req.method, req.url, 'Origin:', req.headers.origin || '(none)');
  next();
});

// Whitelist básico + localhost
const ALLOWED = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://172.27.80.1:5173', // ajustá si tu Vite muestra otra IP
  WEB_PUBLIC_URL,
  API_PUBLIC_URL,
  'null',     // file://
  undefined,  // curl/postman (sin Origin)
]);

app.use(cors({
  origin(origin, cb) {
    // Si no seteaste WEB_PUBLIC_URL en dev, relajamos y aceptamos todo
    if (!WEB_PUBLIC_URL) return cb(null, true);
    if (ALLOWED.has(origin)) return cb(null, true);
    // Cualquier localhost:* (por si cambiás puerto)
    if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));


/* ─────────────────────────────────────────────
 * Middlewares comunes
 * ───────────────────────────────────────────── */
app.use(express.json());
app.use(cookieParser());

/* ─────────────────────────────────────────────
 * Healthchecks
 * ───────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/auth/health', (_req, res) => res.json({ ok: true }));
app.get('/api/cors-check', (req, res) => {
  res.json({ ok: true, origin: req.headers.origin || null });
});

/* ─────────────────────────────────────────────
 * Rutas API
 * ───────────────────────────────────────────── */
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', webhookRoutes); // ej: /api/mercadopago/webhook
app.use('/api', adminRoutes);   // ej: /api/admin/*
app.use('/api/employees', requireAuth, adminOrDesk, employeeRoutes);

/* ─────────────────────────────────────────────
 * Errores no atrapados (para no crashear)
 * ───────────────────────────────────────────── */
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

/* ─────────────────────────────────────────────
 * Listen
 * ───────────────────────────────────────────── */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API ATIX escuchando en http://localhost:${PORT}`);
  console.log('WEB_PUBLIC_URL:', WEB_PUBLIC_URL);
  console.log('API_PUBLIC_URL:', API_PUBLIC_URL);
});
