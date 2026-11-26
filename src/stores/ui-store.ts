import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ToastNotice {
  id: string;
  kind: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

interface UiState {
  soundsEnabled: boolean;
  setSoundsEnabled: (enabled: boolean) => void;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  mobileSheetOpen: boolean;
  quickCreateOpen: boolean;
  isOffline: boolean;
  toasts: ToastNotice[];
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMobileSheetOpen: (open: boolean) => void;
  setQuickCreateOpen: (open: boolean) => void;
  setOffline: (offline: boolean) => void;
  pushToast: (toast: Omit<ToastNotice, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      soundsEnabled: false,
      setSoundsEnabled: (soundsEnabled) => set({ soundsEnabled }),
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      mobileSheetOpen: false,
      quickCreateOpen: false,
      isOffline: false,
      toasts: [],
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setMobileSheetOpen: (open) => set({ mobileSheetOpen: open }),
      setQuickCreateOpen: (open) => set({ quickCreateOpen: open }),
      setOffline: (offline) => set({ isOffline: offline }),
      pushToast: (toast) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
          toasts: [...s.toasts.slice(-3), { ...toast, id }],
        }));
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            useUiStore.getState().dismissToast(id);
          }, 4000);
        }
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'nexora-ui-v1',
      partialize: ({ sidebarCollapsed, soundsEnabled }) => ({ sidebarCollapsed, soundsEnabled }),
    },
  ),
);
