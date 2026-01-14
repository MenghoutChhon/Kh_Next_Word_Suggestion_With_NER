import axios from 'axios';
import { getModelConfig, modelRegistry } from './mlRegistry';
import { createMockMLServer } from './mockServer';

class MLService {
  private mockServerStarted = false;

  async listModels() {
    if (!modelRegistry.length && process.env.ENABLE_MOCK_ML === 'true') {
      this.ensureMockServer();
      return [
        {
          name: 'mock-model',
          displayName: 'Mock Malware Detector',
          endpoint: `http://localhost:${process.env.MOCK_ML_PORT || 8999}`,
        },
      ];
    }

    if (!modelRegistry.length) {
      throw new Error('No ML models are registered. Set ML_MODEL_REGISTRY in the environment.');
    }
    return modelRegistry.map(({ name, displayName, endpoint }) => ({
      name,
      displayName,
      endpoint,
    }));
  }

  async predict(modelName: string, input: any) {
    if (process.env.ENABLE_MOCK_ML === 'true' && modelName === 'mock-model') {
      this.ensureMockServer();
      return {
        model: 'mock-model',
        endpoint: `http://localhost:${process.env.MOCK_ML_PORT || 8999}`,
        data: {
          model: 'mock-model',
          prediction: {
            label: 'benign',
            score: 0.93,
            top_classes: [
              { label: 'benign', score: 0.93 },
              { label: 'suspicious', score: 0.05 },
              { label: 'malicious', score: 0.02 },
            ],
          },
        },
      };
    }

    const config = getModelConfig(modelName);
    if (!config) {
      throw new Error(`Model '${modelName}' is not registered`);
    }

    const timeout = config.timeoutMs || 20000;
    const url = `${config.endpoint.replace(/\/$/, '')}/predict`;

    const response = await axios.post(
      url,
      { input, modelName },
      { timeout, headers: { 'Content-Type': 'application/json' } }
    );

    return {
      model: modelName,
      endpoint: config.endpoint,
      data: response.data,
    };
  }

  private ensureMockServer() {
    if (this.mockServerStarted) return;
    const port = Number(process.env.MOCK_ML_PORT) || 8999;
    createMockMLServer(port);
    this.mockServerStarted = true;
  }
}

export const mlService = new MLService();
export default mlService;
