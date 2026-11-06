// =====================================================================
//  Shared Firebase configuration
//
//  PLACE THIS IN A SHARED LOCATION, e.g.:
//    src/Shared/Firebase/firebaseConfig.js
//
//  It is reused by every feature that needs Firebase (Storage for product
//  images today, and any other images/files later). Do NOT duplicate this
//  file per feature.
//
//  If you already initialize Firebase for LOGIN somewhere, prefer adding the
//  `getStorage` export to that existing file instead of creating this one,
//  so the app has a single Firebase app instance.
// =====================================================================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Values from Firebase Console -> Project settings -> Your apps -> SDK config.
// Prefer environment variables (.env, prefixed REACT_APP_ for CRA).
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize once and reuse (avoids "app already exists" on hot reloads).
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Shared instances. Import these anywhere in the app.
export const firebaseStorage = getStorage(firebaseApp);

export default firebaseApp;

// ---------------------------------------------------------------------
// .env example for project kdauth-9893b (do NOT commit real values):
//
//   REACT_APP_FIREBASE_API_KEY=xxxxxxxx
//   REACT_APP_FIREBASE_AUTH_DOMAIN=kdauth-9893b.firebaseapp.com
//   REACT_APP_FIREBASE_PROJECT_ID=kdauth-9893b
//   REACT_APP_FIREBASE_STORAGE_BUCKET=kdauth-9893b.firebasestorage.app
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=000000000000
//   REACT_APP_FIREBASE_APP_ID=1:000000000000:web:abcdef
// ---------------------------------------------------------------------
