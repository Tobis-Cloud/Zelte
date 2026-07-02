// ===================================================
// firebase-config.js
// Firebase-Konfiguration – BITTE MIT EIGENEN WERTEN BEFÜLLEN
// ===================================================

// ⚠️  WICHTIG: Ersetze die Platzhalter mit deinen echten Firebase-Werten
// Diese findest du in der Firebase Console unter Projekteinstellungen > Allgemein > Deine Apps

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "DEIN_API_KEY",
  authDomain:        "DEIN_AUTH_DOMAIN",
  projectId:         "DEINE_PROJECT_ID",
  storageBucket:     "DEIN_STORAGE_BUCKET",
  messagingSenderId: "DEINE_MESSAGING_SENDER_ID",
  appId:             "DEINE_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
