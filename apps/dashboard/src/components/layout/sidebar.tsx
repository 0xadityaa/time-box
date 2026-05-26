import Link from 'next/link';
import { LayoutDashboard, ListTree, Activity } from 'lucide-react';

export function Sidebar() {
  return (
    <div className="w-64 border-r bg-black/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col p-4 gap-4">
      <div className="flex items-center gap-2 px-2 py-4">
        <Activity className="h-6 w-6 text-blue-500" />
        <span className="font-bold text-lg tracking-tight">time-box</span>
      </div>
      
      <nav className="flex flex-col gap-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium text-zinc-300 hover:text-white">
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </Link>
        <Link href="/traces" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium text-zinc-300 hover:text-white">
          <ListTree className="h-4 w-4" />
          Traces
        </Link>
      </nav>
    </div>
  );
}
