// Emulator-only entry. Production builds always use index.js.
import React, { useEffect, useState } from 'react';
import { AppRegistry, Text } from 'react-native';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
} from '@react-native-firebase/firestore';
import { name as appName } from '../app.json';
function QaRoot() {
  const [Component, setComponent] = useState(null),
    [error, setError] = useState('Connecting to local QA services…');
  useEffect(() => {
    (async () => {
      await connectAuthEmulator(getAuth(), 'http://127.0.0.1:9099');
      await connectFirestoreEmulator(getFirestore(), '127.0.0.1', 8080);
      await signInWithEmailAndPassword(
        getAuth(),
        'admin@example.test',
        'test-only-123',
      );
      const App = require('../App').default;
      setComponent(() => App);
    })().catch(e => setError(e.message));
  }, []);
  return Component ? (
    <Component />
  ) : (
    <Text style={{ margin: 60 }}>{error}</Text>
  );
}
AppRegistry.registerComponent(appName, () => QaRoot);
