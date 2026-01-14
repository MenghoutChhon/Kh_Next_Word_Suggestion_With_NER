import { Request, Response } from 'express';
import { nerExtract } from '../services/ml/khmerNer.service';
import { usageService } from '../services/usage/usage.service';

class KhmerNerController {
  async extract(req: Request, res: Response) {
    try {
      const { text } = req.body ?? {};
      if (!text) {
        return res.status(400).json({ success: false, message: 'text is required' });
      }
      const userId = (req as any).user?.id;
      const data = await nerExtract(text);
      if (userId) {
        try {
          await usageService.trackUsage(userId, 'api_call', 1, { type: 'ner:extract' });
        } catch (usageError) {
          console.warn('Failed to track NER usage:', usageError);
        }
      }
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('NER extract error:', error);
      const status = error.response?.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'NER extract failed',
        details: error.response?.data,
      });
    }
  }
}

export const khmerNerController = new KhmerNerController();
export default khmerNerController;
