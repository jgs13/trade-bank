import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDIwMc8lgfPxeQbwAntk3nsnvztlP1ZMXc",
  authDomain: "trade-bank-win.firebaseapp.com",
  projectId: "trade-bank-win",
  storageBucket: "trade-bank-win.firebasestorage.app",
  messagingSenderId: "1048228650440",
  appId: "1:1048228650440:web:3a7111cd030566b53134fd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);