'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Archive,
  Bell,
  ChevronRight,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  User,
} from 'lucide-react';
import { CommandPalette } from '@/components/layout/command-palette';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { TopicIcon } from '@/components/shared/topic-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utilities/cn';
import { computeElapsedSeconds, formatTimerClock } from '@/lib/utilities/dates';
import { transitionTimeSessionAtomic } from '@/services/modules.service';
import {
  fetchWorkspaceBootstrap,
  markAllNotificationsRead,
  type WorkspaceBootstrapData,
} from '@/services/workspace.service';
import { useUiStore } from '@/stores/ui-store';

export function AppShell({
  initialBootstrap,
  children,
}: {
  initialBootstrap: WorkspaceBootstrapData;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const mobileSheetOpen = useUiStore((s) => s.mobileSheetOpen);
  const setMobileSheetOpen = useUiStore((s) => s.setMobileSheetOpen);
  const pushToast = useUiStore((s) => s.pushToast);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [timerBusy, setTimerBusy] = useState(false);

  const { data: bootstrap } = useQuery({
    queryKey: ['workspace-bootstrap', initialBootstrap.userId],
    queryFn: () =>
      fetchWorkspaceBootstrap(createClient(), initialBootstrap.userId, initialBootstrap.email),
    initialData: initialBootstrap,
  });

  const appName = bootstrap.preferences?.app_name?.trim() || 'NEXORA';
  const activeTopics = bootstrap.topics.filter((t) => t.status === 'active');
  const archivedCount = bootstrap.topics.filter((t) => t.status === 'archived').length;
  const unreadNotifs = bootstrap.notifications.filter((n) => !n.is_read);
  const activeTimer = bootstrap.runningTimer;

  useEffect(() => {
    document.title = `${appName} — Personal Operating System`;
  }, [appName]);

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== 'running') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  const elapsedSeconds = activeTimer
    ? computeElapsedSeconds(
        {
          status: activeTimer.status as 'running' | 'paused' | 'completed',
          accumulated_seconds: activeTimer.accumulated_seconds,
          last_resumed_at: activeTimer.last_resumed_at,
          started_at: activeTimer.started_at,
        },
        nowMs,
      )
    : 0;

  async function handleTimerAction(action: 'pause' | 'resume' | 'stop') {
    if (!activeTimer || timerBusy) return;
    setTimerBusy(true);
    try {
      await transitionTimeSessionAtomic(
        createClient(),
        activeTimer.id,
        action,
        activeTimer.version,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['time-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      ]);
      pushToast({
        kind: 'success',
        title: action === 'stop' ? 'Session saved' : action === 'pause' ? 'Timer paused' : 'Timer resumed',
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Timer update failed',
        description: err instanceof Error ? err.message : 'Please reload to sync state.',
      });
    } finally {
      setTimerBusy(false);
    }
  }

  async function handleMarkNotificationsRead() {
    try {
      await markAllNotificationsRead(createClient(), bootstrap.userId);
      await queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] });
    } catch {
      // Non-fatal
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const breadcrumbs = (() => {
    if (pathname.startsWith('/topics/new')) return ['Topics', 'New Topic Builder'];
    if (pathname.startsWith('/topics/')) {
      const slug = pathname.split('/')[2] ?? '';
      const matched = bootstrap.topics.find((t) => t.slug === slug);
      return ['Topics', matched?.name ?? slug];
    }
    if (pathname.startsWith('/topics')) return ['Topics'];
    if (pathname.startsWith('/activity')) return ['Activity'];
    if (pathname.startsWith('/settings')) return ['Settings'];
    return ['Dashboard'];
  })();

  const primaryNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/topics', label: 'Topics', icon: Layers },
    { href: '/activity', label: 'Activity', icon: Activity },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const renderSidebarContent = (collapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-3.5">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          {!collapsed ? (
            <span className="truncate text-sm font-bold tracking-tight" translate="no">
              {appName}
            </span>
          ) : null}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="p-3">
        <Link
          href="/topics/new"
          onClick={() => setMobileSheetOpen(false)}
          className={cn(
            'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'px-0',
          )}
          title="New Topic"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>New Topic</span> : null}
        </Link>
      </div>

      <nav aria-label="Workspace navigation" className="space-y-1 px-2.5">
        {primaryNav.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSheetOpen(false)}
              title={item.label}
              className={cn(
                'flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="mt-5 flex-1 overflow-y-auto px-2.5 pb-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Topics ({activeTopics.length})
            </span>
            {archivedCount > 0 ? (
              <Link
                href="/topics?status=archived"
                onClick={() => setMobileSheetOpen(false)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Archive className="h-3 w-3" aria-hidden="true" />
                {archivedCount}
              </Link>
            ) : null}
          </div>

          {activeTopics.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No active topics yet. Create your first workspace module above.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {activeTopics.map((topic) => {
                const active = pathname === `/topics/${topic.slug}`;
                return (
                  <li key={topic.id}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      onClick={() => setMobileSheetOpen(false)}
                      className={cn(
                        'flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                          ? 'bg-muted font-semibold text-foreground'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: topic.accent_color }}
                      >
                        <TopicIcon name={topic.icon} className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{topic.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-1 overflow-y-auto px-2">
          {activeTopics.slice(0, 8).map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              title={topic.name}
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: topic.accent_color }}
              >
                <TopicIcon name={topic.icon} className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 md:block',
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]',
        )}
      >
        <div className="sticky top-0 h-dvh">{renderSidebarContent(sidebarCollapsed)}</div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="left" title={appName} description="Workspace navigation & topics" className="p-0">
          {renderSidebarContent(false)}
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSheetOpen(true)}
                aria-label="Open navigation menu"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
                <span className="font-semibold text-foreground md:hidden" translate="no">
                  {appName}
                </span>
                <span className="hidden items-center gap-1.5 md:flex">
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                    {appName}
                  </Link>
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={crumb} className="flex items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span
                        className={cn(
                          'truncate',
                          idx === breadcrumbs.length - 1
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {crumb}
                      </span>
                    </span>
                  ))}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {activeTimer ? (
                <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      activeTimer.status === 'running' ? 'animate-pulse bg-success' : 'bg-warning',
                    )}
                    aria-hidden="true"
                  />
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatTimerClock(elapsedSeconds)}
                  </span>
                  <button
                    type="button"
                    disabled={timerBusy}
                    onClick={() =>
                      handleTimerAction(activeTimer.status === 'running' ? 'pause' : 'resume')
                    }
                    aria-label={activeTimer.status === 'running' ? 'Pause timer' : 'Resume timer'}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:bg-background"
                  >
                    {activeTimer.status === 'running' ? (
                      <Pause className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Play className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={timerBusy}
                    onClick={() => handleTimerAction('stop')}
                    aria-label="Stop and save timer"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-destructive hover:bg-background"
                  >
                    <Square className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandPaletteOpen(true)}
                aria-label="Open global search and command palette"
                className="min-h-10 gap-2 px-2.5 sm:px-3"
              >
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="hidden text-muted-foreground sm:inline">Search…</span>
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-block">
                  ⌘K
                </kbd>
              </Button>

              {/* Notification Center */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Notifications (${unreadNotifs.length} unread)`}
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileOpen(false);
                  }}
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadNotifs.length > 0 ? (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                  ) : null}
                </Button>
                {notifOpen ? (
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-card p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">Notifications</span>
                      {unreadNotifs.length > 0 ? (
                        <button
                          type="button"
                          onClick={handleMarkNotificationsRead}
                          className="cursor-pointer text-xs font-medium text-primary hover:underline"
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>
                    {bootstrap.notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        No notifications right now.
                      </p>
                    ) : (
                      <ul className="max-h-64 space-y-2 overflow-y-auto">
                        {bootstrap.notifications.map((n) => (
                          <li
                            key={n.id}
                            className={cn(
                              'rounded-md border border-border p-2.5 text-xs',
                              !n.is_read && 'bg-primary/5',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground">{n.title}</span>
                              {!n.is_read ? <Badge variant="primary">New</Badge> : null}
                            </div>
                            {n.body ? (
                              <p className="mt-1 text-muted-foreground">{n.body}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>

              <ThemeToggle compact />

              {/* Profile Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="User profile menu"
                  onClick={() => {
                    setProfileOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                </Button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card p-2 shadow-xl">
                    <div className="border-b border-border px-2.5 py-2">
                      <p className="truncate text-sm font-semibold">
                        {bootstrap.profile?.full_name || 'Workspace Owner'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{bootstrap.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex min-h-10 items-center gap-2 rounded-md px-2.5 text-sm hover:bg-muted"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      Settings &amp; Export
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 px-3 py-5 pb-24 sm:px-6 md:pb-8"
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Dedicated Mobile Bottom Navigation (5 touch-friendly slots >= 44px) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        {[
          { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { href: '/topics', label: 'Topics', icon: Layers },
          { href: '/topics/new', label: 'Create', icon: Plus },
          { href: '/activity', label: 'Activity', icon: Activity },
          { href: '/settings', label: 'Profile', icon: User },
        ].map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CommandPalette topics={bootstrap.topics} />
    </div>
  );
}
