import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { TenantConfig } from '../api/types';
import { apiClient } from '../api/client';
import { queryClient } from '../api/query-client';

interface TenantContextValue {
  tenants: TenantConfig[];
  activeTenant: TenantConfig | null;
  setActiveTenant: (id: string) => void;
  addTenant: (tenant: TenantConfig) => void;
  removeTenant: (id: string) => void;
  updateTenant: (tenant: TenantConfig) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

// v2 key: current-platform configs (apiBaseUrl/tenantGuid/workerGuid/apiKey).
// The old 'doozer_tenants' entries targeted the retired v2 API and are ignored.
const STORAGE_KEY = 'doozer_tenants_v2';
const ACTIVE_KEY = 'doozer_active_tenant_v2';

/** Local-dev seed from gitignored .env.local — never ship a populated build. */
function envDefaultTenant(): TenantConfig | null {
  const env = import.meta.env;
  const apiBaseUrl = env.VITE_DEFAULT_API_BASE_URL as string | undefined;
  const tenantGuid = env.VITE_DEFAULT_TENANT_GUID as string | undefined;
  const workerGuid = env.VITE_DEFAULT_WORKER_GUID as string | undefined;
  if (!apiBaseUrl || !tenantGuid || !workerGuid) return null;
  return {
    id: 'env-default',
    displayName: (env.VITE_DEFAULT_TENANT_NAME as string | undefined) ?? 'Default',
    apiBaseUrl,
    apiKey: (env.VITE_DEFAULT_API_KEY as string | undefined) ?? '',
    tenantGuid,
    workerGuid,
  };
}

function loadTenants(): TenantConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  const seed = envDefaultTenant();
  return seed ? [seed] : [];
}

function loadActiveId(tenants: TenantConfig[]): string {
  const stored = localStorage.getItem(ACTIVE_KEY);
  if (stored && tenants.some((t) => t.id === stored)) return stored;
  return tenants[0]?.id ?? '';
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<TenantConfig[]>(loadTenants);
  const [activeId, setActiveId] = useState<string>(() =>
    loadActiveId(loadTenants()),
  );

  const activeTenant = tenants.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (activeTenant) {
      apiClient.setTenant(activeTenant);
    }
  }, [activeTenant]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const setActiveTenantById = useCallback((id: string) => {
    setActiveId(id);
    queryClient.clear();
  }, []);

  const addTenant = useCallback((tenant: TenantConfig) => {
    setTenants((prev) => [...prev, tenant]);
    setActiveId(tenant.id);
    queryClient.clear();
  }, []);

  const removeTenant = useCallback(
    (id: string) => {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      if (activeId === id) {
        setTenants((prev) => {
          if (prev.length > 0) setActiveId(prev[0].id);
          return prev;
        });
      }
    },
    [activeId],
  );

  const updateTenant = useCallback((tenant: TenantConfig) => {
    setTenants((prev) => prev.map((t) => (t.id === tenant.id ? tenant : t)));
    queryClient.clear();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenants,
        activeTenant,
        setActiveTenant: setActiveTenantById,
        addTenant,
        removeTenant,
        updateTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
