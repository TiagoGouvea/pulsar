import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const rules = readFileSync(new URL('./probe.rules', import.meta.url), 'utf8');
const testEnv = await initializeTestEnvironment({
  projectId: 'demo-pulsar',
  firestore: { rules, host: '127.0.0.1', port: 8090 }
});
const db = testEnv.authenticatedContext('u1').firestore();
for (const collection of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
  const ref = doc(db, collection, 'a');
  try {
    await setDoc(ref, { value: 1 });
    await updateDoc(ref, { other: 2 });
    console.log(`${collection}: ALLOWED`);
  } catch (error) {
    console.log(`${collection}: ${error.message.replace(/\n/g, ' | ').slice(0, 220)}`);
  }
}
await testEnv.cleanup();
