// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { showCustomAlert } from './app.js'; // Import custom alert

// Your web app's Firebase configuration - Using the provided config
const firebaseConfig = {
  apiKey: "AIzaSyC9eufzO00_JtbdVoDrw-bJfF1PY3meYoE",
  authDomain: "new2025-d2fba.firebaseapp.com",
  projectId: "new2025-d2fba",
  storageBucket: "new2025-d2fba.firebasestorage.app",
  messagingSenderId: "239931222059",
  appId: "1:239931222059:web:6275e5aa6577fb14f4e26e",
  measurementId: "G-3F4TJ0K34J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Export auth instance AFTER initialization

// --- Login Page Logic ---
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessageDiv = document.getElementById('errorMessage');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessageDiv.textContent = '';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showCustomAlert('تم تسجيل الدخول بنجاح!', 'success');
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000); // Give time for alert to show
        } catch (error) {
            console.error("Login Error:", error);
            let message = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'البريد الإلكتروني غير صالح.';
                    break;
                case 'auth/user-disabled':
                    message = 'هذا الحساب معطل.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                    break;
                default:
                    message = 'حدث خطأ غير متوقع: ' + error.message;
            }
            errorMessageDiv.textContent = message; // Keep error in form for immediate feedback
            showCustomAlert(message, 'error'); // Also show a custom alert
        }
    });
}

// --- NEW: Function to ensure Firebase Auth is ready and user state is known ---
export function onAuthAndFirebaseReady(callback) {
    // This will fire immediately if already signed in, or after sign-in.
    // It guarantees that the 'auth' object is fully initialized.
    onAuthStateChanged(auth, (user) => {
        // If user is null, it means not logged in or auth is ready and no user.
        // If user is an object, it means logged in.
        callback(user);
    });
}

// --- Logout Function ---
export async function signOutUser() {
    try {
        await firebaseSignOut(auth);
        showCustomAlert('تم تسجيل الخروج بنجاح.', 'success');
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    } catch (error) {
        console.error("Logout Error:", error);
        showCustomAlert('حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.', 'error');
    }
}

// Attach logout to sidebar button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');
    if (logoutBtnSidebar) {
        logoutBtnSidebar.addEventListener('click', signOutUser);
    }
});
