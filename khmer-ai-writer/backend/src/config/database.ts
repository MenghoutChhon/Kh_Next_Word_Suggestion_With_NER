// Mock database without Prisma dependency

const mockUsers = new Map();
const mockReports = new Map();
const mockApiKeys = new Map();
const mockOrganizations = new Map();
const mockTeamMembers = new Map();
const mockDocuments = new Map();
const mockAuditLogs = new Map();

export const prisma = {
  user: {
    findUnique: async ({ where }: any) => {
      return mockUsers.get(where.email) || null;
    },
    create: async ({ data }: any) => {
      const user = { id: Date.now().toString(), ...data, createdAt: new Date(), updatedAt: new Date() };
      mockUsers.set(data.email, user);
      return user;
    },
    deleteMany: async (_args?: any) => ({ count: 0 })
  },
  apiKey: {
    findUnique: async ({ where }: any) => {
      return mockApiKeys.get(where.key_prefix) || null;
    },
    create: async ({ data }: any) => {
      const apiKey = { id: Date.now().toString(), ...data, createdAt: new Date() };
      mockApiKeys.set(data.key_prefix, apiKey);
      return apiKey;
    }
  },
  api_key: {
    findUnique: async ({ where }: any) => {
      return mockApiKeys.get(where.key_prefix) || null;
    },
    create: async ({ data }: any) => {
      const apiKey = { id: Date.now().toString(), ...data, createdAt: new Date() };
      mockApiKeys.set(data.key_prefix, apiKey);
      return apiKey;
    }
  },
  organization: {
    findUnique: async ({ where }: any) => {
      return mockOrganizations.get(where.id) || null;
    },
    create: async ({ data }: any) => {
      const org = { id: Date.now().toString(), ...data, createdAt: new Date() };
      mockOrganizations.set(org.id, org);
      return org;
    },
    deleteMany: async (_args?: any) => ({ count: 0 })
  },
  team_member: {
    findMany: async () => [],
    create: async ({ data }: any) => {
      const member = { id: Date.now().toString(), ...data, createdAt: new Date() };
      mockTeamMembers.set(member.id, member);
      return member;
    },
    deleteMany: async (_args?: any) => ({ count: 0 })
  },
  document: {
    findFirst: async ({ where }: any) => {
      return Array.from(mockDocuments.values()).find((doc: any) => 
        doc.id === where.id && doc.userId === where.userId
      ) || null;
    },
    findMany: async ({ where }: any) => {
      return Array.from(mockDocuments.values()).filter((doc: any) => 
        doc.userId === where.userId && doc.status !== 'deleted'
      );
    },
    create: async ({ data }: any) => {
      const doc = { id: Date.now().toString(), ...data, createdAt: new Date(), updatedAt: new Date() };
      mockDocuments.set(doc.id, doc);
      return doc;
    },
    update: async ({ where, data }: any) => {
      const doc = mockDocuments.get(where.id);
      if (doc) {
        Object.assign(doc, data, { updatedAt: new Date() });
        mockDocuments.set(where.id, doc);
      }
      return doc;
    }
  },
  auditLog: {
    findMany: async ({ where, skip, take }: any) => {
      let logs = Array.from(mockAuditLogs.values());
      if (where?.userId) logs = logs.filter((log: any) => log.userId === where.userId);
      if (where?.action) logs = logs.filter((log: any) => log.action === where.action);
      if (where?.resource_type) logs = logs.filter((log: any) => log.resource_type === where.resource_type);
      if (where?.resource_id) logs = logs.filter((log: any) => log.resource_id === where.resource_id);
      return logs.slice(skip || 0, (skip || 0) + (take || logs.length));
    },
    count: async ({ where }: any) => {
      let logs = Array.from(mockAuditLogs.values());
      if (where?.userId) logs = logs.filter((log: any) => log.userId === where.userId);
      if (where?.action) logs = logs.filter((log: any) => log.action === where.action);
      return logs.length;
    },
    create: async ({ data }: any) => {
      const log = { id: Date.now().toString(), ...data, createdAt: new Date() };
      mockAuditLogs.set(log.id, log);
      return log;
    }
  }
};

export default prisma;
