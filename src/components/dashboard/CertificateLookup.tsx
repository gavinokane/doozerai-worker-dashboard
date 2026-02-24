import { useState, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useCertificateInstances } from '../../api/hooks/useCertificateInstances';
import { timeAgo } from '../../lib/utils';

interface CertificateLookupProps {
  dateRange: string;
}

export function CertificateLookup({ dateRange }: CertificateLookupProps) {
  const { submissions, isLoading, totalInstances, loadedInstances } =
    useCertificateInstances(dateRange);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter(
      (s) =>
        s.certificateNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerEmail.toLowerCase().includes(q) ||
        s.exactAddress.toLowerCase().includes(q),
    );
  }, [submissions, search]);

  const loading = isLoading || loadedInstances < totalInstances;

  return (
    <Card title="Certificate Submissions">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by certificate #, name, email, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        {loading && (
          <span className="text-xs text-gray-400">
            Loading {loadedInstances}/{totalInstances}...
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <FileText size={32} className="mb-2" />
          <p className="text-sm">No certificate submissions found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Certificate #
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Customer Name
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Address
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr
                    key={sub.instanceId}
                    className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30"
                  >
                    <td className="py-3 pr-4 font-mono font-medium text-gray-900 dark:text-white">
                      {sub.certificateNumber || '-'}
                    </td>
                    <td className="py-3 pr-4 text-gray-900 dark:text-white">
                      {sub.customerName || '-'}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                      {sub.customerEmail || '-'}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                      {sub.exactAddress || '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={sub.status} />
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">
                      {timeAgo(sub.createdDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            {filtered.length} of {submissions.length} certificates
            {search && ' (filtered)'}
          </div>
        </>
      )}
    </Card>
  );
}
