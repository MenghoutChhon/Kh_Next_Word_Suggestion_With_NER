// Mock webhook service without external dependencies

export class WebhookService {
  async storeEvent(provider: string, payload: any) {
    console.log('Mock webhook store event:', { provider, payload });
    return { id: 'mock-event-id', provider, payload, timestamp: new Date() };
  }

  async triggerWebhook(organizationId: string, event: string, payload: any) {
    console.log('Mock webhook trigger:', { organizationId, event, payload });
    return Promise.resolve();
  }

  async deliverWebhook(job: any) {
    console.log('Mock webhook delivery:', job);
    return Promise.resolve();
  }

  private generateSignature(payload: any, secret: string, timestamp: number) {
    return 'mock-signature';
  }
}

export default new WebhookService();