// Mock queue service without Redis dependency

export const reportQueue = {
  add: async (data: any) => {
    console.log('Mock report queue - processing:', data);
    return Promise.resolve();
  }
};

export const webhookQueue = {
  add: async (data: any) => {
    console.log('Mock webhook queue - processing:', data);
    return Promise.resolve();
  },
  process: (concurrency: number, processor: Function) => {
    console.log('Mock webhook queue processor registered');
  }
};

export const addToQueue = async (queueName: string, payload: any) => {
  console.log(`Mock queue ${queueName}:`, payload);
  return Promise.resolve();
};

export default { reportQueue, webhookQueue, addToQueue };
