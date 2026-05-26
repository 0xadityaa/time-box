"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Activity, Settings, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Traces', href: '/traces', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
          <Database className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground tracking-wide text-sm">time-box</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto px-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          System Online
        </div>
      </div>
    </div>
  );
}
