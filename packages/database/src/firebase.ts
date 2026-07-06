/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Project } from '@video-voice-translator/types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom Firestore Database ID for this applet
export const db = getFirestore(app, 'ai-studio-videovoicetransl-ff99bb6f-f2bb-46ba-b3ea-55c712352706');

// Validate connection to Firestore
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or connection.");
    }
  }
}
testFirestoreConnection();

// Set up Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out from Google
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Get current cached or new access token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Helper to recursively remove undefined fields so Firestore doesn't throw errors
function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeFirestoreData(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// Save a project to Firestore
export const saveProjectToFirestore = async (project: Project, userId: string): Promise<void> => {
  const docRef = doc(db, 'projects', project.id);
  const rawPayload = {
    ...project,
    userId,
    updatedAt: new Date().toISOString()
  };
  await setDoc(docRef, sanitizeFirestoreData(rawPayload));
};

// Load all projects of a user from Firestore
export const loadProjectsFromFirestore = async (userId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const projects: Project[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    projects.push({
      id: data.id,
      name: data.name,
      videoUrl: data.videoUrl,
      transcript: data.transcript,
      translatedText: data.translatedText,
      targetLang: data.targetLang,
      selectedVoice: data.selectedVoice,
      speakerVoices: data.speakerVoices,
      detectedSpeakers: data.detectedSpeakers,
      audioBase64: data.audioBase64,
      videoAnalysis: data.videoAnalysis,
      createdAt: data.createdAt || new Date().toISOString()
    });
  });
  return projects;
};

// Delete a project from Firestore
export const deleteProjectFromFirestore = async (projectId: string): Promise<void> => {
  const docRef = doc(db, 'projects', projectId);
  await deleteDoc(docRef);
};

// Interface for Google Drive file details
export interface DriveFile {
  id: string;
  name: string;
  webViewLink?: string;
}

// Upload a File or Blob to Google Drive
export const uploadToGoogleDrive = async (
  file: File | Blob, 
  fileName: string, 
  mimeType: string
): Promise<DriveFile> => {
  if (!cachedAccessToken) {
    throw new Error('No Google Drive Access Token available. Please sign in.');
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`
    },
    body: form
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive upload failed: ${response.statusText}. Details: ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink
  };
};

// List files from Google Drive
export const listGoogleDriveFiles = async (): Promise<DriveFile[]> => {
  if (!cachedAccessToken) {
    throw new Error('No Google Drive Access Token available. Please sign in.');
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=files(id,name,webViewLink)&pageSize=30', {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to list Google Drive files: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
};
