import { collection, getFirestore } from '@react-native-firebase/firestore';

export const BUSINESS_COLLECTIONS = ['tripEntries', 'vehicles', 'parties', 'customers', 'drivers', 'fromcustomers', 'archivedTrips'];
export const LEGACY_WORKSPACE = 'legacy';
let activeWorkspace = null;

export const activateWorkspace = id => {
  if (id !== null && (typeof id !== 'string' || !id || id.includes('/'))) throw new Error('Invalid workspace.');
  activeWorkspace = id;
};

export const getWorkspaceId = () => {
  if (!activeWorkspace) throw new Error('Sign in and select a workspace first.');
  return activeWorkspace;
};

export const assertWritableWorkspace = (id = getWorkspaceId()) => {
  if (id === LEGACY_WORKSPACE) throw new Error('Existing data is preserved for review. Select a user workspace to make changes.');
  return id;
};

export const workspaceCollection = (name, id = getWorkspaceId()) => {
  if (!BUSINESS_COLLECTIONS.includes(name)) throw new Error('Unknown workspace collection.');
  return id === LEGACY_WORKSPACE
    ? collection(getFirestore(), name)
    : collection(getFirestore(), 'workspaces', id, name);
};

// Capture these references once per operation so switching cannot redirect an in-flight write.
export const workspaceCollections = (id = getWorkspaceId()) => Object.fromEntries(
  BUSINESS_COLLECTIONS.map(name => [name, workspaceCollection(name, id)]),
);
