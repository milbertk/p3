// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, FacebookAuthProvider, signInWithCustomToken } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUnab4zTD9eaLo02DFdlsWeM0HbvTyWeQ",
  authDomain: "kdauth-9893b.firebaseapp.com",
  projectId: "kdauth-9893b",
  storageBucket: "kdauth-9893b.firebasestorage.app",
  messagingSenderId: "52829214404",
  appId: "1:52829214404:web:9110abc7cc63d60512db91",
  measurementId: "G-ZB26YYD3VQ"
};

// Initialize Firebase app
export const appFirebase = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and providers
const auth = getAuth(appFirebase);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider("microsoft.com");

// Firebase Storage (shared instance, reused across the app for file uploads).
export const firebaseStorage = getStorage(appFirebase);

// Export auth and providers properly
export { auth, googleProvider, microsoftProvider, OAuthProvider, signInWithCustomToken };
export const facebookProvider = new FacebookAuthProvider();