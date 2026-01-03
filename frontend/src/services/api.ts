import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  Bill,
  CreateBillData,
  Item,
  CreateItemData,
  Payment,
  CreatePaymentData,
  User,
  PaginationParams,
} from '@/types';

const API_BASE_URL = '/api/v1';

class ApiService {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch {
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      this.refreshPromise = null;
      return accessToken;
    })();

    return this.refreshPromise;
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  hasTokens(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  // Auth endpoints
  async requestOTP(phoneNumber: string, countryCode = '+1'): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.post('/auth/otp/request', {
      phoneNumber,
      countryCode,
    });
    return response.data;
  }

  async verifyOTP(phoneNumber: string, code: string, countryCode = '+1'): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post('/auth/otp/verify', {
      phoneNumber,
      code,
      countryCode,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // User endpoints
  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    const response = await this.client.patch('/users/profile', data);
    return response.data;
  }

  async searchUsers(phone: string): Promise<ApiResponse<{ users: User[] }>> {
    const response = await this.client.get('/users/search', {
      params: { phone },
    });
    return response.data;
  }

  // Bill endpoints
  async getBills(params?: PaginationParams & { status?: string }): Promise<ApiResponse<Bill[]>> {
    const response = await this.client.get('/bills', { params });
    return response.data;
  }

  async getBill(idOrCode: string): Promise<ApiResponse<{ bill: Bill; items: Item[]; payments: Payment[] }>> {
    const response = await this.client.get(`/bills/${idOrCode}`);
    return response.data;
  }

  async createBill(data: CreateBillData): Promise<ApiResponse<{ bill: Bill }>> {
    const response = await this.client.post('/bills', data);
    return response.data;
  }

  async updateBill(id: string, data: Partial<CreateBillData>): Promise<ApiResponse<{ bill: Bill }>> {
    const response = await this.client.patch(`/bills/${id}`, data);
    return response.data;
  }

  async deleteBill(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.delete(`/bills/${id}`);
    return response.data;
  }

  async addParticipant(
    billId: string,
    data: { user?: string; phoneNumber?: string; name?: string }
  ): Promise<ApiResponse<{ bill: Bill }>> {
    const response = await this.client.post(`/bills/${billId}/participants`, data);
    return response.data;
  }

  async removeParticipant(billId: string, participantId: string): Promise<ApiResponse<{ bill: Bill }>> {
    const response = await this.client.delete(`/bills/${billId}/participants/${participantId}`);
    return response.data;
  }

  async calculateSplit(billId: string): Promise<ApiResponse<{ split: unknown }>> {
    const response = await this.client.get(`/bills/${billId}/split`);
    return response.data;
  }

  // Item endpoints
  async getItems(billId: string): Promise<ApiResponse<{ items: Item[] }>> {
    const response = await this.client.get(`/bills/${billId}/items`);
    return response.data;
  }

  async createItem(billId: string, data: CreateItemData): Promise<ApiResponse<{ item: Item }>> {
    const response = await this.client.post(`/bills/${billId}/items`, data);
    return response.data;
  }

  async updateItem(billId: string, itemId: string, data: Partial<CreateItemData>): Promise<ApiResponse<{ item: Item }>> {
    const response = await this.client.patch(`/bills/${billId}/items/${itemId}`, data);
    return response.data;
  }

  async deleteItem(billId: string, itemId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.delete(`/bills/${billId}/items/${itemId}`);
    return response.data;
  }

  async assignItem(
    billId: string,
    itemId: string,
    participantIds: string[],
    assignmentType = 'equal'
  ): Promise<ApiResponse<{ item: Item }>> {
    const response = await this.client.post(`/bills/${billId}/items/${itemId}/assign`, {
      participantIds,
      assignmentType,
    });
    return response.data;
  }

  async bulkCreateItems(billId: string, items: CreateItemData[]): Promise<ApiResponse<{ items: Item[] }>> {
    const response = await this.client.post(`/bills/${billId}/items/bulk`, { items });
    return response.data;
  }

  // Payment endpoints
  async getPayments(billId: string): Promise<ApiResponse<{ payments: Payment[] }>> {
    const response = await this.client.get(`/bills/${billId}/payments`);
    return response.data;
  }

  async createPayment(billId: string, data: CreatePaymentData): Promise<ApiResponse<{ payment: Payment }>> {
    const response = await this.client.post(`/bills/${billId}/payments`, data);
    return response.data;
  }

  async confirmPayment(paymentId: string): Promise<ApiResponse<{ payment: Payment }>> {
    const response = await this.client.post(`/payments/${paymentId}/confirm`);
    return response.data;
  }

  async getPaymentSummary(): Promise<ApiResponse<{ summary: unknown }>> {
    const response = await this.client.get('/payments/summary');
    return response.data;
  }

  async getMyPayments(): Promise<ApiResponse<{ payments: Payment[] }>> {
    const response = await this.client.get('/payments/my');
    return response.data;
  }
}

export const api = new ApiService();
export default api;
