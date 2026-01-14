// Mock AWS S3 client without actual AWS dependency

export const s3Client = {
  send: async (command: any) => {
    console.log('Mock S3 operation:', command.constructor.name);
    return { Location: 'mock-s3-url', Key: 'mock-key' };
  }
};

export const S3_BUCKET_NAME = 'mock-bucket';

export default s3Client;