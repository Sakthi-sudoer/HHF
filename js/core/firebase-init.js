// 🌟 FIREBASE V9 MODULAR SDK INITIALIZATION MODULE
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Production Firebase Configuration for hhfoods-3ab9b
const firebaseConfig = {
  apiKey: "AIzaSyCzYfDtoOjLumIwT8xXxMoLHlnfpbLkqC8",
  authDomain: "hhfoods-3ab9b.firebaseapp.com",
  projectId: "hhfoods-3ab9b",
  storageBucket: "hhfoods-3ab9b.firebasestorage.app",
  messagingSenderId: "211209874774",
  appId: "1:211209874774:web:b30d04a5b0beb4b9c97af7",
  measurementId: "G-PRNSFFYLZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
