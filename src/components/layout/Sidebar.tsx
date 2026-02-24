import { LayoutDashboard, Bot } from 'lucide-react';
import { useWorker } from '../../api/hooks/useWorker';

export function Sidebar() {
  const { data: worker } = useWorker();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Bot size={28} className="text-primary" />
        <div>
          <h1 className="text-lg font-bold">DoozerAI</h1>
          <p className="text-xs text-gray-400">Worker Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <a
          href="#"
          className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium"
        >
          <LayoutDashboard size={18} />
          Dashboard
        </a>
      </nav>

      {worker && (
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            {worker.Picture ? (
              <img
                src={worker.Picture}
                alt={worker.Name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold">
                {worker.Name?.charAt(0) ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{worker.Name}</p>
              <p className="truncate text-xs text-gray-400">
                {worker.Role ?? 'Worker'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
