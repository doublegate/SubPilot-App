'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  Settings,
  CreditCard,
  Building,
  Activity,
  Shield,
  BarChart3,
  Database,
  FileCode,
  AlertCircle,
} from 'lucide-react';

const navigation = [
  {
    title: 'Overview',
    href: '/admin',
    icon: BarChart3,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Billing',
    href: '/admin/billing',
    icon: CreditCard,
  },
  {
    title: 'Plaid Config',
    href: '/admin/plaid',
    icon: Building,
  },
  {
    title: 'System',
    href: '/admin/system',
    icon: Settings,
  },
  {
    title: 'Security',
    href: '/admin/security',
    icon: Shield,
  },
  {
    title: 'Database',
    href: '/admin/database',
    icon: Database,
  },
  {
    title: 'API Keys',
    href: '/admin/api-keys',
    icon: FileCode,
  },
  {
    title: 'Monitoring',
    href: '/admin/monitoring',
    icon: Activity,
  },
  {
    title: 'Errors',
    href: '/admin/errors',
    icon: AlertCircle,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">Site Management</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-4">
        {navigation.map(item => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-primary-foreground bg-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
