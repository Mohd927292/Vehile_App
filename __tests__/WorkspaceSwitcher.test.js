import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import WorkspaceSwitcher from '../src/components/WorkspaceSwitcher';
import { useWorkspace } from '../src/context/WorkspaceContext';
import { getDocsFromServer as getDocs } from '@react-native-firebase/firestore';

jest.mock('../src/context/WorkspaceContext', () => ({ useWorkspace: jest.fn() }));
jest.mock('../src/hooks/useTheme', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('@react-native-firebase/firestore', () => ({ getDocsFromServer: jest.fn(), collection: jest.fn(), getFirestore: jest.fn() }));

let tree;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; jest.clearAllMocks(); });
test('ordinary user has no switch or directory fetch', async () => {
  useWorkspace.mockReturnValue({ isAdmin: false, workspace: { id: 'alice', displayName: 'Alice' } });
  await act(async () => { tree = renderer.create(<WorkspaceSwitcher />); });
  expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  expect(getDocs).not.toHaveBeenCalled();
});
test('admin selects a searched user and can review legacy records', async () => {
  const switchWorkspace = jest.fn();
  useWorkspace.mockReturnValue({ isAdmin: true, member: { id: 'admin' }, workspace: { id: 'admin', displayName: 'Admin' }, switchWorkspace });
  getDocs.mockResolvedValue({ docs: [
    { id: 'alice', data: () => ({ displayName: 'Alice', email: 'alice@example.test', active: true }) },
    { id: 'bob', data: () => ({ displayName: 'Bob', email: 'bob@example.test', active: true }) },
    { id: 'disabled', data: () => ({ displayName: 'Disabled', email: 'disabled@example.test', active: false }) },
  ] });
  await act(async () => { tree = renderer.create(<WorkspaceSwitcher />); });
  const button = label => tree.root.findAllByType(TouchableOpacity).find(item => item.props.accessibilityLabel === label);
  await act(async () => button('Switch user').props.onPress());
  expect(button('Open workspace disabled@example.test')).toBeUndefined();
  await act(async () => tree.root.findByType(TextInput).props.onChangeText('bob'));
  expect(button('Open workspace alice@example.test')).toBeUndefined();
  await act(async () => button('Open workspace bob@example.test').props.onPress());
  expect(switchWorkspace).toHaveBeenCalledWith(expect.objectContaining({ id: 'bob' }));
  await act(async () => button('Switch user').props.onPress());
  await act(async () => button('Review existing shared data').props.onPress());
  expect(switchWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'legacy' }));
});
