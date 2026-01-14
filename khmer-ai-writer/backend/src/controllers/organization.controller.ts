import { Request, Response } from 'express';
import prisma from '../config/database';

const getParamId = (param: string | string[] | undefined) => {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
};

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const org = await prisma.organization.create({ data: { name } });
    res.status(201).json(org);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
};

export const getOrganization = async (req: Request, res: Response) => {
  try {
    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Organization id is required' });
    }
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return res.status(404).json({ error: 'Not found' });
    res.json(org);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
};

export default { createOrganization, getOrganization };
