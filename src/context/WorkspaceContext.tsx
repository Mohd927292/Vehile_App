import { createContext, useContext } from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type Workspace = { id: string; displayName: string; email: string };
export type Member = Workspace & { active: boolean; role: 'admin' | 'user' };
type WorkspaceState = {
  user: FirebaseAuthTypes.User | null;
  member: Member | null;
  workspace: Workspace | null;
  switchWorkspace: (workspace: Workspace) => void;
  isAdmin: boolean;
  readOnly: boolean;
};

export const WorkspaceContext = createContext<WorkspaceState | null>(null);
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('Workspace is not available.');
  return context;
};
