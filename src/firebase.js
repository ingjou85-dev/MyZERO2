import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD-l23toCO4dFzU9LcxfPCtdTPALPb_RVk",
  authDomain: "unipackzero.firebaseapp.com",
  projectId: "unipackzero",
  storageBucket: "unipackzero.firebasestorage.app",
  messagingSenderId: "647759273735",
  appId: "1:647759273735:web:0de90c4312ebc1f9da2fa2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
