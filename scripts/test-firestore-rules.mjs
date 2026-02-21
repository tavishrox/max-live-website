import fs from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const OWNER_UID = '05378337030731377140';
const APP_ID = 'tone-shift-hub';
const BLOG_COLLECTION_PATH = `artifacts/${APP_ID}/public/data/blogPosts`;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [host, portString] = emulatorHost.split(':');
const port = Number(portString);

if (!host || Number.isNaN(port)) {
  throw new Error(`Invalid FIRESTORE_EMULATOR_HOST value: "${emulatorHost}"`);
}

async function run() {
  const rules = await fs.readFile('firestore.rules', 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: 'rules-test-project',
    firestore: {
      host,
      port,
      rules,
    },
  });

  try {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const otherDb = testEnv.authenticatedContext('not-the-owner').firestore();

    // Public read should be allowed.
    await assertSucceeds(getDoc(doc(anonDb, `${BLOG_COLLECTION_PATH}/public-read-check`)));

    // Unauthenticated writes should be blocked.
    await assertFails(
      setDoc(doc(anonDb, `${BLOG_COLLECTION_PATH}/anon-write-check`), {
        title: 'blocked',
        content: 'anon should not write',
      }),
    );

    // Owner writes should be allowed.
    await assertSucceeds(
      setDoc(doc(ownerDb, `${BLOG_COLLECTION_PATH}/owner-write-check`), {
        title: 'allowed',
        content: 'owner can write',
      }),
    );

    // Non-owner authenticated writes should be blocked.
    await assertFails(
      setDoc(doc(otherDb, `${BLOG_COLLECTION_PATH}/other-write-check`), {
        title: 'blocked',
        content: 'other user should not write',
      }),
    );

    // Non-owner deletes should be blocked.
    await assertFails(deleteDoc(doc(otherDb, `${BLOG_COLLECTION_PATH}/owner-write-check`)));

    console.log('PASS: Firestore rules enforce owner-only writes and public reads.');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error('FAIL: Firestore rules test failed.');
  console.error(error);
  process.exit(1);
});
