'use client';

import { createContext, useContext } from 'react';
import type { WorkspaceBootstrapData } from '@/services/workspace.service';

export const WorkspaceContext = createContext<WorkspaceBootstrapData | null>(null);

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('Workspace context is unavailable');
  return workspace;
}
