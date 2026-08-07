import { useState, type FormEvent } from 'react';
import { Bot } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { isUsableTenant } from '../../lib/utils';
import type { TenantConfig } from '../../api/types';

const DEV_API_BASE = 'https://func-doozer-c824-api-dev.azurewebsites.net/api';

/**
 * First-run (or incomplete-config) screen. Tenant configs live only in
 * localStorage — no keys or customer GUIDs ship in the bundle.
 */
export function TenantSetup() {
  const { activeTenant, addTenant, updateTenant } = useTenant();

  const [form, setForm] = useState<TenantConfig>(
    activeTenant ?? {
      id: `tenant-${crypto.randomUUID().slice(0, 8)}`,
      displayName: '',
      apiBaseUrl: DEV_API_BASE,
      apiKey: '',
      tenantGuid: '',
      workerGuid: '',
    },
  );
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TenantConfig>(key: K, value: TenantConfig[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed: TenantConfig = {
      ...form,
      displayName: form.displayName.trim() || 'Default',
      apiBaseUrl: form.apiBaseUrl.trim().replace(/\/$/, ''),
      apiKey: form.apiKey.trim(),
      tenantGuid: form.tenantGuid.trim(),
      workerGuid: form.workerGuid.trim(),
    };
    if (!isUsableTenant(trimmed)) {
      setError('All fields except the display name are required.');
      return;
    }
    if (activeTenant && activeTenant.id === trimmed.id) {
      updateTenant(trimmed);
    } else {
      addTenant(trimmed);
    }
  }

  const fields: Array<{
    key: keyof TenantConfig;
    label: string;
    placeholder: string;
    type?: string;
  }> = [
    { key: 'displayName', label: 'Display name', placeholder: 'e.g. Legendary / Top Level' },
    { key: 'apiBaseUrl', label: 'API base URL', placeholder: DEV_API_BASE },
    { key: 'tenantGuid', label: 'Tenant GUID', placeholder: '00000000-0000-0000-0000-000000000000' },
    { key: 'workerGuid', label: 'Worker GUID', placeholder: '00000000-0000-0000-0000-000000000000' },
    { key: 'apiKey', label: 'API key (X-Api-Key)', placeholder: 'tenant-scoped API key', type: 'password' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <Bot size={32} className="text-primary" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Connect to Doozer
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter the tenant this dashboard should read
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {f.label}
              </label>
              <input
                type={f.type ?? 'text'}
                value={form[f.key] as string}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Connect
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400">
          Stored only in this browser&apos;s localStorage. The key is sent as
          the <code>X-Api-Key</code> header on every request.
        </p>
      </div>
    </div>
  );
}
