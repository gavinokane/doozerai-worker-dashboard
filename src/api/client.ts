import type { TenantConfig } from './types';

const API_BASE_URL = 'https://api.doozerai.com/v3';

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

class ApiClient {
  private tenant: TenantConfig | null = null;

  setTenant(tenant: TenantConfig) {
    this.tenant = tenant;
  }

  getTenant(): TenantConfig | null {
    return this.tenant;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!this.tenant) throw new Error('No tenant configured');

    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') {
          url.searchParams.set(k, v);
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'API_KEY': this.tenant.apiKey,
        'Ocp-Apim-Subscription-Key': this.tenant.subscriptionKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
