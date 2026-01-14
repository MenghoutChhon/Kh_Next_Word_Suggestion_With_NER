import { Request, Response } from 'express';
import mlService from '../services/ml/ml.service';

class MLController {
  async listModels(req: Request, res: Response) {
    try {
      const models = await mlService.listModels();
      return res.json({ success: true, models });
    } catch (error: any) {
      console.error('List models error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to list models' });
    }
  }

  async predict(req: Request, res: Response) {
    try {
      const { modelName, input } = req.body;
      if (!modelName || !input) {
        return res.status(400).json({ success: false, message: 'modelName and input are required' });
      }

      const result = await mlService.predict(modelName, input);
      return res.json({ success: true, result });
    } catch (error: any) {
      console.error('Prediction error:', error);
      const status = error.response?.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Prediction failed',
        details: error.response?.data,
      });
    }
  }
}

export const mlController = new MLController();
export default mlController;
