import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAb0QhUC4yr3fymJvfH8kqqiw4RE05r4yI",
  authDomain: "alteration-app.firebaseapp.com",
  projectId: "alteration-app",
  storageBucket: "alteration-app.firebasestorage.app",
  messagingSenderId: "164353458751",
  appId: "1:164353458751:web:3620c460b4ee1a1830ee8a",
  measurementId: "G-NK93T3MG2F"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
