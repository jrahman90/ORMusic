// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCNBOBxYImdPOkyRAbToIdPX6pfecewIF8",
  authDomain: "or-music-events.firebaseapp.com",
  projectId: "or-music-events",
  storageBucket: "or-music-events.appspot.com",
  messagingSenderId: "338908608283",
  appId: "1:338908608283:web:a7d014704863670b4605be",
  measurementId: "G-HNXPP8CPHK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app)
const auth = getAuth(app)
const firestore = getFirestore(app)
export default getFirestore();

export { firestore, storage, auth };