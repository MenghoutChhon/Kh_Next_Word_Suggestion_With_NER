import { Request, Response } from 'express';
import webhookService from '../services/core/webhook.service';

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const provider = req.headers['x-provider'] as string || 'unknown';
    const event = await webhookService.storeEvent(provider, req.body);
    res.status(201).json(event);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export default { handleWebhook };