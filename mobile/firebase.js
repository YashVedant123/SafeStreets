import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDGP4D9Ur_hZFAt0lNGeDXwzeheMHHXHbQ",
  authDomain: "safestreets-f9329.firebaseapp.com",
  projectId: "safestreets-f9329",
  storageBucket: "safestreets-f9329.firebasestorage.app",
  messagingSenderId: "81153646306",
  appId: "1:81153646306:web:a3584e7f3747f85b60c8bb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;