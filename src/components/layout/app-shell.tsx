'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Popover } from 'radix-ui';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Bell,
  ChevronRight,
  Layers,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { FocusTimer } from '@/components/layout/focus-timer';
import { WorkspaceNavigation } from '@/components/layout/workspace-navigation';
import { CommandPalette } from '@/components/layout/command-palette';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { TopicIcon } from '@/components/shared/topic-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { displayAppName } from '@/lib/utilities/app-name';
import { cn } from '@/lib/utilities/cn';
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

  const [profileOpen, setProfileOpen] = useState(false);

  const { data: bootstrap } = useQuery({
    queryKey: ['workspace-bootstrap', initialBootstrap.userId],
    queryFn: () =>
      fetchWorkspaceBootstrap(createClient(), initialBootstrap.userId, initialBootstrap.email),
    initialData: initialBootstrap,
  });

  const appName = displayAppName(bootstrap.preferences?.app_name);
  const activeTopics = bootstrap.topics.filter((t) => t.status === 'active');
  const archivedCount = bootstrap.topics.filter((t) => t.status === 'archived').length;
  const unreadNotifs = bootstrap.notifications.filter((n) => !n.is_read);
  const activeTimer = bootstrap.runningTimer;

  useEffect(() => {
    document.title = `${appName} — Personal Operating System`;
  }, [appName]);

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
    if (pathname === '/review') return ['Review'];
    return ['Today'];
  })();

  const renderSidebarContent = (collapsed: boolean, inDrawer = false) => (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full">
      {!inDrawer && (
        <div
          className={cn(
            'flex h-16 shrink-0 items-center justify-between border-b border-border px-3.5',
            collapsed && 'justify-center px-0',
          )}
        >
          <Link
            href="/dashboard"
            aria-label={appName}
            className={cn(
              'flex min-w-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed && 'hidden',
            )}
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
      )}

      <div className="p-3">
        <Link
          href="/topics/new"
          onClick={() => setMobileSheetOpen(false)}
          className={cn(
            'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'px-0',
          )}
          title="New Topic"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>New Topic</span> : null}
        </Link>
      </div>

      {!inDrawer && (
        <WorkspaceNavigation pathname={pathname} placement="rail" collapsed={collapsed} />
      )}

      {!collapsed ? (
        <div className="mt-5 flex-1 overflow-y-auto px-2.5 pb-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Topic shortcuts ({activeTopics.length})
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
                        'flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
    <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
      <div className="flex min-h-dvh min-w-0 bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden shrink-0 border-r border-border bg-muted/55 motion-safe:transition-[width] duration-200 lg:block',
            sidebarCollapsed ? 'w-[68px]' : 'w-[226px]',
          )}
        >
          <div className="sticky top-0 h-dvh">{renderSidebarContent(sidebarCollapsed)}</div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <SheetContent
          side="left"
          title={appName}
          description="Jump to a topic or create a new one."
          className="flex flex-col gap-0 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-left-8 motion-safe:duration-200"
        >
          {renderSidebarContent(false, true)}
        </SheetContent>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-sm">
            <div className="flex min-h-16 flex-wrap items-center gap-1 px-3 py-1.5 sm:flex-nowrap sm:justify-between sm:gap-2 sm:px-6">
              <div className="mr-auto flex min-w-0 flex-1 items-center gap-1.5">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open topic switcher"
                    className="min-h-11 min-w-11 lg:hidden"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
                  <span className="truncate font-semibold text-foreground lg:hidden" translate="no">
                    {appName}
                  </span>
                  <span className="hidden min-w-0 items-center gap-1.5 lg:flex">
                    <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                      {appName}
                    </Link>
                    {breadcrumbs.map((crumb, idx) => (
                      <span key={crumb} className="flex min-w-0 items-center gap-1.5">
                        <ChevronRight
                          className="h-3.5 w-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
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

              <div className="contents sm:flex sm:items-center sm:gap-2">
                {activeTimer && <FocusTimer activeTimer={activeTimer} />}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="min-h-11 min-w-11 gap-2 px-2.5 sm:px-3"
                >
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only sm:hidden">Search</span>
                  <span className="hidden text-muted-foreground sm:inline">
                    Search<span aria-hidden="true">…</span>
                  </span>
                  <kbd
                    aria-hidden="true"
                    className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-block"
                  >
                    ⌘K
                  </kbd>
                </Button>

                {/* Notification Center */}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Notifications (${unreadNotifs.length} unread)`}
                      className="relative min-h-11 min-w-11"
                    >
                      <Bell className="h-4 w-4" aria-hidden="true" />
                      {unreadNotifs.length > 0 ? (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                      ) : null}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      aria-label="Notifications"
                      sideOffset={8}
                      collisionPadding={12}
                      align="end"
                      className="z-50 w-80 max-w-[calc(100vw-1.5rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
                    >
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
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

                <span className="hidden sm:inline-flex">
                  <ThemeToggle compact />
                </span>

                {/* Profile Menu */}
                <Popover.Root open={profileOpen} onOpenChange={setProfileOpen}>
                  <Popover.Trigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="User profile menu"
                      className="min-h-11 min-w-11 rounded-full bg-primary/10 text-primary"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      aria-label="Account"
                      align="end"
                      sideOffset={8}
                      collisionPadding={12}
                      className="z-50 w-60 max-h-[var(--radix-popover-content-available-height)] overflow-auto rounded-xl border border-border bg-card p-2 text-card-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
                    >
                      <div className="border-b border-border px-2.5 py-2">
                        <p className="truncate text-sm font-semibold">
                          {bootstrap.profile?.full_name || 'Workspace Owner'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{bootstrap.email}</p>
                      </div>
                      <div className="flex items-center justify-between px-2.5 pt-2 text-sm sm:hidden">
                        <span>Appearance</span>
                        <ThemeToggle />
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
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            </div>
          </header>

          <main
            id="main-content"
            className="min-w-0 flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-7 lg:px-9 lg:py-8"
          >
            <div key={pathname} className="workspace-route mx-auto min-w-0 max-w-6xl">
              {children}
            </div>
          </main>
        </div>

        <WorkspaceNavigation pathname={pathname} placement="dock" />

        <CommandPalette topics={bootstrap.topics} />
      </div>
    </Sheet>
  );
}
