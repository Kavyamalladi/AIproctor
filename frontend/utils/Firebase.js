import {getAuth, GoogleAuthProvider} from "firebase/auth"
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY ,
  authDomain: "loginonekart-32c17.firebaseapp.com",
  projectId: "loginonekart-32c17",
  storageBucket: "loginonekart-32c17.firebasestorage.app",
  messagingSenderId: "73286744292",
  appId: "1:73286744292:web:34ef0a0bfade90022854f1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export {auth,provider}

