import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use custom firestoreDatabaseId from the config if present
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || undefined);

// Firebase Storage instance
export const storage = getStorage(app);
// Prevent SDK hanging for 10 minutes on network or CORS errors
storage.maxUploadRetryTime = 6000;
storage.maxOperationRetryTime = 6000;

export default app;
