import request from 'supertest';
import app from '../../app';

describe('route: /api', () => {
  it('returns the health payload for the root router', async () => {
    const { body, status } = await request(app).get('/api');

    expect(status).toBe(200);
    expect(body).toMatchObject({
      status: 'Khmer AI Writer API',
      version: '1.0.0',
      ready: true
    });
  });
});
