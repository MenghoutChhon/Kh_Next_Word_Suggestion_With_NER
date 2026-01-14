import express from 'express';

// Tiny mock ML server for demo/testing. Returns static prediction.
export function createMockMLServer(port: number = 8999) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', mock: true });
  });

  app.post('/predict', (req, res) => {
    const input = req.body?.input;
    res.json({
      model: 'mock-model',
      received: input,
      prediction: {
        label: 'benign',
        score: 0.93,
        top_classes: [
          { label: 'benign', score: 0.93 },
          { label: 'suspicious', score: 0.05 },
          { label: 'malicious', score: 0.02 }
        ]
      },
      latency_ms: 5
    });
  });

  const server = app.listen(port, () => {
    console.log(`[MockML] listening on ${port}`);
  });

  return server;
}

export default createMockMLServer;
