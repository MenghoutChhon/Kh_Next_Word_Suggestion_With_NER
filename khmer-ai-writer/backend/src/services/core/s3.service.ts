// Mock S3 service without AWS dependency

export class S3Service {
  async uploadFile(file: Express.Multer.File, organizationId: string, resourceId: string) {
    const key = `mock-files/${organizationId}/${resourceId}/${file.originalname}`;
    console.log('Mock S3 upload:', key);
    
    return {
      key,
      url: `https://mock-bucket.s3.amazonaws.com/${key}`
    };
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600) {
    console.log('Mock S3 signed URL for:', key);
    return `https://mock-bucket.s3.amazonaws.com/${key}?signed=true`;
  }

  async deleteFile(key: string) {
    console.log('Mock S3 delete:', key);
    return Promise.resolve();
  }

  async uploadReport(buffer: Buffer, organizationId: string, reportId: string, format: string) {
    const key = `mock-reports/${organizationId}/${reportId}.${format}`;
    console.log('Mock S3 report upload:', key);
    return { key };
  }
}

export default S3Service;
