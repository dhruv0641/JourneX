import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { Activity, ChartNoAxesColumn, Layers, Plus, Sunrise } from 'lucide-react';
import { cn } from '@/lib/utilities/cn';

const destinations = [
  { href: '/dashboard', label: 'Today', icon: Sunrise },
  { href: '/topics', label: 'Topics', icon: Layers },
  { href: '/topics/new', label: 'Create', icon: Plus },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/review', label: 'Review', icon: ChartNoAxesColumn },
];

function NavigationPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="nav-pending" aria-label="Loading" /> : null;
}

export function WorkspaceNavigation({
  pathname,
  placement,
  collapsed = false,
}: {
  pathname: string;
  placement: 'rail' | 'dock';
  collapsed?: boolean;
}) {
  const mobile = placement === 'dock';
  return (
    <nav
      aria-label={mobile ? 'Mobile navigation' : 'Workspace navigation'}
      className={mobile ? 'workspace-dock lg:hidden' : 'space-y-1 px-2.5'}
    >
      {destinations
        .filter((d) => mobile || d.href !== '/topics/new')
        .map(({ href, label, icon: Icon }) => {
          const active =
            href === '/topics'
              ? pathname === href || (pathname.startsWith('/topics/') && pathname !== '/topics/new')
              : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                mobile ? 'dock-link' : 'rail-link',
                collapsed && 'rail-collapsed',
                href === '/topics/new' && 'dock-create',
              )}
            >
              <span className="nav-symbol">
                <Icon size={19} aria-hidden="true" />
              </span>
              {(mobile || !collapsed) && <span>{label}</span>}
              <NavigationPending />
            </Link>
          );
        })}
    </nav>
  );
}
