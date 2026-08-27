"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1dPejsoeUT98KPbzYY2amWeuq1qMIzQA",
  authDomain: "bureaucracy-action-agent.firebaseapp.com",
  projectId: "bureaucracy-action-agent",
  storageBucket: "bureaucracy-action-agent.firebasestorage.app",
  messagingSenderId: "760863161403",
  appId: "1:760863161403:web:fbbf9ab7d460f000ccf01e",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOut() {
  return firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };
