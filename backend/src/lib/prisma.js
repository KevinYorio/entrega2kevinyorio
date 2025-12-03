// /src/lib/prisma.js
import { PrismaClient } from '@prisma/client';

let prisma;
if (!global.__PRISMA__) {
  global.__PRISMA__ = new PrismaClient();
}
prisma = global.__PRISMA__;

export default prisma;
