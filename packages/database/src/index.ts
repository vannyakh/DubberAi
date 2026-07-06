export {
  auth,
  db,
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  saveProjectToFirestore,
  loadProjectsFromFirestore,
  deleteProjectFromFirestore,
  uploadToGoogleDrive,
  listGoogleDriveFiles,
} from './firebase';

export type { DriveFile } from './firebase';
