import axios, { AxiosInstance, AxiosError } from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface ApiErrorResponse {
  error: string;
  details?: any;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  tier: 'free' | 'premium' | 'business';
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  requests_used_hour: number;
  status: 'active' | 'revoked';
  createdAt: string;
  last_used_at?: string;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  public user: User | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true, // Enable credentials for CORS
    });

    // Load token from localStorage (only in browser)
    if (typeof window !== 'undefined') {
      // Support both legacy and current storage keys to avoid session loss after refresh
      const storedToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user') || localStorage.getItem('user_data');

      this.token = storedToken;
      if (this.token) {
        this.setToken(this.token);
      }
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    }

    // Add error interceptor
    this.client.interceptors.response.use(
      (res) => res,
      (err: AxiosError<ApiErrorResponse>) => {
        if (err.response?.status === 401 && typeof window !== 'undefined') {
          this.clearToken();
          window.location.href = '/';
        }
        // Don't auto-logout on 429 rate limits, just log the error
        if (err.response?.status === 429) {
          console.warn('Rate limit exceeded, retrying after delay...');
        }
        return Promise.reject(err);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
    }
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  setUser(user: User) {
    this.user = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_data', JSON.stringify(user));
    }
  }

  clearToken() {
    this.token = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
    delete this.client.defaults.headers.Authorization;
  }

  // Auth endpoints
  async register(data: { email: string; password: string; name?: string; tier?: string }) {
    const res = await this.client.post('/auth/register', data);
    if (res.data.token && res.data.user) {
      this.setToken(res.data.token);
      this.setUser(res.data.user);
    }
    return res.data;
  }

  async login(email: string, password: string) {
    const res = await this.client.post('/auth/login', { email, password });
    if (res.data.token && res.data.user) {
      this.setToken(res.data.token);
      this.setUser(res.data.user);
    }
    return res.data;
  }

  async forgotPassword(email: string) {
    const res = await this.client.post('/auth/forgot-password', { email });
    return res.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const res = await this.client.post('/auth/reset-password', { token, newPassword });
    return res.data;
  }

  // API Keys endpoints (Premium/Business only)
  async createApiKey(name: string, scopes: string[] = ['lm:suggest', 'ner:extract'], rateLimit = 100): Promise<{ apiKey: ApiKey; key: string }> {
    const res = await this.client.post('/apikey/create', { name, scopes, rate_limit_per_hour: rateLimit });
    return res.data;
  }

  async listApiKeys(): Promise<{ apiKeys: ApiKey[] }> {
    const res = await this.client.get('/apikey/list');
    return res.data;
  }

  async revokeApiKey(id: string): Promise<{ message: string }> {
    const res = await this.client.delete(`/apikey/${id}`);
    return res.data;
  }

  // Billing Methods
  async getBillingHistory() {
    const response = await this.client.get('/billing');
    return response.data;
  }

  async getBillingById(billingId: string) {
    const response = await this.client.get(`/billing/${billingId}`);
    return response.data;
  }

  async getUsageStats(startDate?: string, endDate?: string) {
    const res = await this.client.get('/dashboard/usage', { params: { startDate, endDate } });
    return res.data;
  }

  async getDashboardStats() {
    const res = await this.client.get('/dashboard/stats');
    return res.data;
  }

  async getUserMetrics() {
    try {
      const response = await this.client.get('/user/metrics');
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // User tier check helpers
  canUseApiKeys(): boolean {
    return this.user?.tier === 'premium' || this.user?.tier === 'business';
  }

  canUseTeamManagement(): boolean {
    return this.user?.tier === 'business';
  }

  canUseAdvancedReports(): boolean {
    return this.user?.tier === 'business';
  }

  getScanLimits(): { daily: number; hourly: number } {
    switch (this.user?.tier) {
      case 'premium':
        return { daily: 100, hourly: 50 };
      case 'business':
        return { daily: -1, hourly: 200 }; // -1 means unlimited
      default:
        return { daily: 10, hourly: 5 };
    }
  }

  // Payment & Subscription Methods
  async processPayment(data: {
    tier: 'premium' | 'business';
    paymentMethod: string;
    billingCycle: 'monthly' | 'annual';
    transactionId?: string;
    couponCode?: string;
    discount?: number;
  }) {
    const response = await this.client.post('/payment/process', data);
    // Refresh user data after successful payment
    if (response.data.success) {
      const profileResponse = await this.client.get('/user/profile');
      if (profileResponse.data && profileResponse.data.user) {
        this.setUser(profileResponse.data.user);
      }
    }
    return response.data;
  }

  async getSubscription() {
    const response = await this.client.get('/payment/subscription');
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.client.post('/payment/cancel-subscription');
    return response.data;
  }

  async upgradeTier(newTier: string, reason?: string) {
    const response = await this.client.post('/payment/upgrade-tier', { newTier, reason });
    return response.data;
  }

  async downgradeTier(newTier: string, reason?: string) {
    const response = await this.client.post('/payment/downgrade-tier', { newTier, reason });
    return response.data;
  }

  // Team Management Methods
  async getTeamInfo() {
    const response = await this.client.get('/team');
    return response.data;
  }

  async inviteTeamMember(email: string, name: string, role: string = 'member') {
    const response = await this.client.post('/team/invite', { email, name, role });
    return response.data;
  }

  async removeTeamMember(memberId: string) {
    const response = await this.client.delete(`/team/members/${memberId}`);
    return response.data;
  }

  async updateMemberRole(memberId: string, role: string) {
    const response = await this.client.put(`/team/members/${memberId}/role`, { role });
    return response.data;
  }

  async getTeamStats() {
    const response = await this.client.get('/team/stats');
    return response.data;
  }

  // User Management Methods
  async updateProfile(data: { name?: string; email?: string }) {
    const response = await this.client.put('/user/profile', data);
    if (response.data.success && response.data.user) {
      this.setUser(response.data.user);
    }
    return response.data;
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.put('/user/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async deleteAccount(password: string, confirmDelete: string) {
    const response = await this.client.delete('/user/account', {
      data: { password, confirmDelete }
    });
    if (response.data.success) {
      this.clearToken();
    }
    return response.data;
  }

  async getActivityLog(limit: number = 50) {
    const response = await this.client.get('/user/activity', { params: { limit } });
    return response.data;
  }

  async getPreferences() {
    const response = await this.client.get('/user/preferences');
    return response.data;
  }

  async updatePreferences(data: { privacy?: any; notifications?: any }) {
    const response = await this.client.put('/user/preferences', data);
    return response.data;
  }

  // Team Invitation Methods
  async getPendingInvitations() {
    const response = await this.client.get('/team/invitations/pending');
    return response.data;
  }

  async acceptInvitation(invitationId: string) {
    const response = await this.client.post(`/team/invitations/${invitationId}/accept`);
    return response.data;
  }

  async declineInvitation(invitationId: string) {
    const response = await this.client.post(`/team/invitations/${invitationId}/decline`);
    return response.data;
  }

  async leaveTeam(teamId: string) {
    const response = await this.client.post(`/team/leave/${teamId}`);
    return response.data;
  }

  // Usage & Metrics Methods
  async getUserUsage() {
    const response = await this.client.get('/usage/user');
    return response.data;
  }

  async getUsageHistory(limit: number = 50, type?: string) {
    const response = await this.client.get('/usage/history', {
      params: { limit, type }
    });
    return response.data;
  }

  async getTeamUsage() {
    const response = await this.client.get('/usage/team');
    return response.data;
  }

  async checkLimit(actionType: 'api_call') {
    const response = await this.client.get('/usage/check-limit', {
      params: { actionType }
    });
    return response.data;
  }

  async getTierLimits(tier: string) {
    const response = await this.client.get('/usage/tier-limits', {
      params: { tier }
    });
    return response.data;
  }

  // ML Adapter Methods
  async listModels() {
    const response = await this.client.get('/ml/models');
    return response.data;
  }

  async predict(modelName: string, input: any) {
    const response = await this.client.post('/ml/predict', { modelName, input });
    return response.data;
  }

  // Khmer LM Methods
  async lmSuggest(text: string, topk = 5, temperature = 1.0) {
    const response = await this.client.post('/lm/suggest', { text, topk, temperature });
    return response.data;
  }

  async nerExtract(text: string) {
    const response = await this.client.post('/ner/extract', { text });
    return response.data;
  }

  // MFA (Multi-Factor Authentication) Methods
  async setupMFA() {
    const response = await this.client.post('/mfa/setup');
    return response.data;
  }

  async verifyAndEnableMFA(code: string) {
    const response = await this.client.post('/mfa/verify', { code });
    return response.data;
  }

  async verifyMFACode(userId: string, code: string) {
    const response = await this.client.post('/mfa/verify-code', { userId, code });
    return response.data;
  }

  async disableMFA(password: string) {
    const response = await this.client.post('/mfa/disable', { password });
    return response.data;
  }

  async regenerateBackupCodes(password: string) {
    const response = await this.client.post('/mfa/regenerate-backup-codes', { password });
    return response.data;
  }

  async getMFAStatus() {
    const response = await this.client.get('/mfa/status');
    return response.data;
  }

  // Session Management Methods
  async getSessions() {
    const response = await this.client.get('/sessions');
    return response.data;
  }

  async revokeSession(sessionId: string) {
    const response = await this.client.delete(`/sessions/${sessionId}`);
    return response.data;
  }

  async revokeAllSessions() {
    const response = await this.client.post('/sessions/revoke-all');
    return response.data;
  }

  // Team Creation & Settings Methods
  async createTeam(data: {
    name: string;
    description?: string;
    memberLimit?: number;
    autoApproveInvites?: boolean;
    requireMfa?: boolean;
  }) {
    const response = await this.client.post('/team/create', data);
    return response.data;
  }

  async updateTeamSettings(teamId: string, settings: {
    name?: string;
    description?: string;
    memberLimit?: number;
    autoApproveInvites?: boolean;
    requireMfa?: boolean;
    allowPublicReports?: boolean;
    dataRetentionDays?: number;
    primaryColor?: string;
  }) {
    const response = await this.client.put(`/team/${teamId}/settings`, settings);
    return response.data;
  }

  async deleteTeam(teamId: string) {
    const response = await this.client.delete(`/team/${teamId}`);
    if (response.data.success) {
      // Refresh user data after team deletion
      const profileResponse = await this.client.get('/user/profile');
      if (profileResponse.data && profileResponse.data.user) {
        this.setUser(profileResponse.data.user);
      }
    }
    return response.data;
  }

  // Document Management Methods
  async uploadDocument(data: {
    name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    access_level?: 'private' | 'team' | 'public';
  }) {
    const response = await this.client.post('/documents', data);
    return response.data;
  }

  async getUserDocuments() {
    const response = await this.client.get('/documents');
    return response.data;
  }

  async getDocument(documentId: string) {
    const response = await this.client.get(`/documents/${documentId}`);
    return response.data;
  }

  async updateDocument(documentId: string, data: {
    name?: string;
    access_level?: 'private' | 'team' | 'public';
    status?: 'active' | 'archived' | 'deleted';
  }) {
    const response = await this.client.put(`/documents/${documentId}`, data);
    return response.data;
  }

  async deleteDocument(documentId: string) {
    const response = await this.client.delete(`/documents/${documentId}`);
    return response.data;
  }

  // Audit Log Methods
  async getUserAuditLogs(params?: { page?: number; limit?: number; action?: string }) {
    const response = await this.client.get('/audit/user', { params });
    return response.data;
  }

  async getResourceAuditLogs(resourceType: string, resourceId: string) {
    const response = await this.client.get(`/audit/resource/${resourceType}/${resourceId}`);
    return response.data;
  }

  async getAllAuditLogs(params?: { page?: number; limit?: number; action?: string; userId?: string }) {
    const response = await this.client.get('/audit/all', { params });
    return response.data;
  }

  private handleError(error: any) {
    // Handle error (e.g., log to an external service)
    console.error('API Error:', error);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
