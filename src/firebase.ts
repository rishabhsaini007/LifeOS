import { initializeApp, getApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseConfigured = false;

// Helper to get configuration from environment variables or localStorage
export function getStoredFirebaseConfig(): FirebaseConfig | null {
  // Check local storage first (user-configured in Settings)
  const saved = localStorage.getItem('lifeos_firebase_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved Firebase config', e);
    }
  }

  // Check Vite env variables
  const envConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

// Initialize Firebase dynamically
export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (config) {
    try {
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      auth = getAuth(app);
      db = getFirestore(app);
      isFirebaseConfigured = true;
      console.log('Firebase successfully initialized!');
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      isFirebaseConfigured = false;
      app = null;
      auth = null;
      db = null;
    }
  } else {
    console.log('No Firebase credentials found. Running in Demo Mode (Local Storage).');
    isFirebaseConfigured = false;
  }
  return { app, auth, db, isFirebaseConfigured };
}

// Initial initialization attempt
const initial = initFirebase();
export const firebaseApp = initial.app;
export const firebaseAuth = initial.auth;
export const firebaseDb = initial.db;
export { isFirebaseConfigured };
export default initFirebase;
