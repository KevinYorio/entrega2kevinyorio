import { Router } from 'express';                // Importa el Router de Express para crear rutas independientes
import { PrismaClient } from '@prisma/client';   // Importa PrismaClient para interactuar con la base de datos

const prisma = new PrismaClient();               // Crea una instancia de Prisma para ejecutar consultas SQL
const router = Router();                         // Inicializa un router de Express

// Ruta GET principal ("/")
// Devuelve todos los planes que están activos en la base de datos
router.get('/', async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { isActive: true } });  // Consulta todos los planes con isActive = true
  res.json(plans);                                                          // Devuelve el resultado en formato JSON
});

export default router;                            // Exporta el router para usarlo en el servidor principal
