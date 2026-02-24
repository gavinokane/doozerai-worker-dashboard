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
import { DEFAULT_TENANT } from '../lib/constants';

interface TenantContextValue {
  tenants: TenantConfig[];
  activeTenant: TenantConfig | null;
  setActiveTenant: (id: string) => void;
  addTenant: (tenant: TenantConfig) => void;
  removeTenant: (id: string) => void;
  updateTenant: (tenant: TenantConfig) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

function loadTenants(): TenantConfig[] {
  try {
    const stored = localStorage.getItem('doozer_tenants');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [DEFAULT_TENANT];
}

function loadActiveId(tenants: TenantConfig[]): string {
  const stored = localStorage.getItem('doozer_active_tenant');
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
    localStorage.setItem('doozer_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    if (activeId) localStorage.setItem('doozer_active_tenant', activeId);
  }, [activeId]);

  const setActiveTenantById = useCallback((id: string) => {
    setActiveId(id);
    queryClient.clear();
  }, []);

  const addTenant = useCallback((tenant: TenantConfig) => {
    setTenants((prev) => [...prev, tenant]);
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
