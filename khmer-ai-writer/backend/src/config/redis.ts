// Mock Redis client without actual Redis dependency

export const redisClient = {
  connect: async () => Promise.resolve(),
  disconnect: async () => Promise.resolve(),
  get: async (key: string) => null,
  set: async (key: string, value: string) => Promise.resolve(),
  del: async (key: string) => Promise.resolve(),
  lPush: async (key: string, value: string) => Promise.resolve(),
  on: (event: string, callback: Function) => {}
};

export default redisClient;