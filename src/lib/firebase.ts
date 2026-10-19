import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

export const firebaseConfig = {
  projectId: 'overcade-b22ff',
  appId: '1:437629253428:web:f0b86c924d58fb1e76d761',
  storageBucket: 'overcade-b22ff.firebasestorage.app',
  apiKey: 'AIzaSyAOvfqnmzZnosYgqyBzHz1e-cA_Pwr74do',
  authDomain: 'overcade-b22ff.firebaseapp.com',
  messagingSenderId: '437629253428',
  measurementId: 'G-LD9XJHXX8X',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfileData {
  email: string;
  displayName: string;
  createdAt: number;
  lastLoginAt: number;
  favoriteGames: string[];
  settings: {
    hapticFeedback: boolean;
    deadzone: number;
  };
}

export async function syncUserProfile(user: User, customCallsign?: string): Promise<void> {
  if (user.isAnonymous) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const now = Date.now();
    const displayName =
      customCallsign ||
      user.displayName ||
      (user.email ? user.email.split('@')[0].toUpperCase() : 'OPERATOR');

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email || 'operator@overcade.local',
        displayName: displayName.slice(0, 60),
        createdAt: now,
        lastLoginAt: now,
        favoriteGames: ['telemetry-arena', 'vortex-drift-09'],
        settings: {
          hapticFeedback: true,
          deadzone: 0.08,
        },
      });
    } else {
      const existing = snap.data();
      await setDoc(
        userRef,
        {
          email: existing.email || user.email || 'operator@overcade.local',
          displayName: (customCallsign || existing.displayName || displayName).slice(0, 60),
          createdAt: existing.createdAt || now,
          lastLoginAt: now,
          favoriteGames: existing.favoriteGames || ['telemetry-arena'],
          settings: existing.settings || { hapticFeedback: true, deadzone: 0.08 },
        },
        { merge: false }
      );
    }
  } catch (err) {
    console.warn('Profile sync skipped:', err);
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await syncUserProfile(credential.user);
  return credential.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  callsign: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (callsign.trim()) {
    await updateProfile(credential.user, { displayName: callsign.trim() });
  }
  await syncUserProfile(credential.user, callsign.trim());
  return credential.user;
}

export async function tryAnonymousSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    // Anonymous auth might not be enabled in Firebase Console; signaling works regardless
    return null;
  }
}

export async function logoutConsole(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged, serverTimestamp, type User };
