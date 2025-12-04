// /src/lib/prisma.js
import { PrismaClient } from '@prisma/client';

// Declaramos una variable local donde almacenaremos la instancia de PrismaClient
let prisma;

// Verificamos si en el objeto global de Node.js NO existe aún una instancia de Prisma.
// Esto evita crear múltiples instancias cuando el servidor se reinicia durante el desarrollo.
if (!global.__PRISMA__) {
  // Si no existe, creamos una nueva instancia de PrismaClient.
  // Esta instancia queda almacenada globalmente y será reutilizada.
  global.__PRISMA__ = new PrismaClient();
}

// Asignamos la instancia global a la variable local 'prisma'.
// Si ya existía, simplemente la reutilizamos.
prisma = global.__PRISMA__;

// Exportamos la instancia de Prisma para que pueda ser utilizada
// en cualquier parte del proyecto sin crear conexiones duplicadas.
export default prisma;
