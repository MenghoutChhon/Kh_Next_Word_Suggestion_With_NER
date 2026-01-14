import { Request, Response } from 'express';
import { lmSuggest } from '../services/ml/khmerLm.service';
import { usageService } from '../services/usage/usage.service';

class KhmerLMController {
  async suggest(req: Request, res: Response) {
    try {
      const { text, topk, temperature } = req.body ?? {};
      if (!text) {
        return res.status(400).json({ success: false, message: 'text is required' });
      }
      const userId = (req as any).user?.id;
      const data = await lmSuggest(text, topk ?? 5, temperature ?? 1.0);
      if (userId) {
        try {
          await usageService.trackUsage(userId, 'api_call', 1, { type: 'lm:suggest' });
        } catch (usageError) {
          console.warn('Failed to track LM usage:', usageError);
        }
      }
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('LM suggest error:', error);
      const status = error.response?.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'LM suggest failed',
        details: error.response?.data,
      });
    }
  }
}

export const khmerLmController = new KhmerLMController();
export default khmerLmController;
