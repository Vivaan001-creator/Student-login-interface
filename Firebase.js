import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
const firebaseConfig = {
  apiKey: "AIzaSyA83oNjXsBaXPl5jVZgdLm2E1f4MMoFfEM",
  authDomain: "school-management-portal-fb8da.firebaseapp.com",
  projectId: "school-management-portal-fb8da",
  storageBucket: "school-management-portal-fb8da.firebasestorage.app",
  messagingSenderId: "271719672244",
  appId: "1:271719672244:web:7396de0b78e997dd672ae1"
};

const app = initializeApp(firebaseConfig);

// App Check (free): lets only your real website and app talk to the database. To switch it on:
// Firebase console > App Check > register this web app with reCAPTCHA v3, paste the site key here,
// upload, then press "Enforce" for Cloud Firestore. Leave empty to keep it off.
const APP_CHECK_SITE_KEY = "";
if (APP_CHECK_SITE_KEY) {
  const ac = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-check.js");
  ac.initializeAppCheck(app, { provider: new ac.ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
export { db, storage, auth };
