import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();

router.get('/', async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { isActive: true } });
  res.json(plans);
});

export default router;
