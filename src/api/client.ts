import type { Paged, TenantConfig } from './types';

export class ApiError extends Error {
  status: number;
  /** Platform error type from the {error, detail, correlation_id} envelope */
  errorType: string | null;
  detail: string | null;
  correlationId: string | null;

  constructor(status: number, body: string) {
    let errorType: string | null = null;
    let detail: string | null = null;
    let correlationId: string | null = null;
    try {
      const parsed = JSON.parse(body);
      errorType = typeof parsed.error === 'string' ? parsed.error : null;
      detail = typeof parsed.detail === 'string' ? parsed.detail : null;
      correlationId =
        typeof parsed.correlation_id === 'string' ? parsed.correlation_id : null;
    } catch {
      // non-JSON body — keep raw text in the message
    }
    super(`API Error ${status}: ${detail ?? errorType ?? body}`);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.detail = detail;
    this.correlationId = correlationId;
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

  /** GET a tenant-scoped path, e.g. get('/workers/abc'). */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!this.tenant) throw new Error('No tenant configured');

    const base = this.tenant.apiBaseUrl.replace(/\/$/, '');
    const url = new URL(`${base}/tenants/${this.tenant.tenantGuid}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') {
          url.searchParams.set(k, v);
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': this.tenant.apiKey,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  /**
   * Fetch every page of a paged list endpoint. We ask for 250 but
   * workflow-instances clamps page_size to 100 (observed on dev), so the
   * loop trusts the server's returned counts. maxPages is a runaway guard.
   */
  async getAllPages<T>(
    endpoint: string,
    params: Record<string, string> = {},
    maxPages = 20,
  ): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const data = await this.get<Paged<T>>(endpoint, {
        ...params,
        page: String(page),
        page_size: '250',
      });
      const pageItems = Array.isArray(data) ? (data as T[]) : (data.items ?? []);
      items.push(...pageItems);
      const total = Array.isArray(data) ? pageItems.length : (data.total_count ?? 0);
      if (items.length >= total || pageItems.length === 0) break;
    }
    return items;
  }
}

export const apiClient = new ApiClient();
