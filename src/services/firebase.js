import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_FIREBASE_API_KEY : undefined;
const authDomain = typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN : undefined;
const projectId = typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_FIREBASE_PROJECT_ID : undefined;
const storageBucket = typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET : undefined;
const messagingSenderId = typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined;
const appId = typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_FIREBASE_APP_ID : undefined;

// Determine if Firebase is configured
export const isFirebaseEnabled = !!(
  apiKey &&
  authDomain &&
  projectId &&
  storageBucket &&
  messagingSenderId &&
  appId
);

let firebaseApp = null;
let auth = null;
let db = null;

if (isFirebaseEnabled) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.warn("Firebase credentials are not fully configured in environment variables. Falling back to Mock DB.");
}

export { auth, db };
