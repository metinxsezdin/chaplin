import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAk6l3oWQe2csyWR-YMjQSJhEW4uDWGSY",
  authDomain: "moviemate-e13c5.firebaseapp.com",
  projectId: "moviemate-e13c5",
  storageBucket: "moviemate-e13c5.firebasestorage.app",
  messagingSenderId: "355090967582",
  appId: "1:355090967582:web:980e4d389ce13be11d920f",
  measurementId: "G-6LGXNN4RZC"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export default firebase; 