// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { showCustomAlert } from './app.js'; // Import custom alert

const firebaseConfig = {
    apiKey: "AIzaSyC9eufzO00_JtbdVoDrw-bJfF1PY3meYoE", // استبدل هذا بمفتاح API الخاص بك
    authDomain: "new2025-d2fba.firebaseapp.com",
    projectId: "new2025-d2fba",
    storageBucket: "new2025-d2fba.firebasestorage.app",
    messagingSenderId: "239931222059",
    appId: "1:239931222059:web:6275e5aa6577fb14f4e26e",
    measurementId: "G-3F4TJ0K34J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Export auth instance

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
            }
            errorMessageDiv.textContent = message; // Keep error in form for immediate feedback
            showCustomAlert(message, 'error'); // Also show a custom alert
        }
    });
}

// --- Auth State Management for protected pages ---
// This function will be called on protected pages (dashboard, product-form)
export function checkAuthStateAndRedirect() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            console.log("User not logged in. Redirecting to login.");
            showCustomAlert('يرجى تسجيل الدخول أولاً.', 'error');
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        }
        // If user is logged in, no action needed, app.js will proceed.
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

// Attach logout to buttons in dashboard/product-form
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');
    const logoutBtnTop = document.getElementById('logoutBtnTop'); // For desktop logout button if kept

    if (logoutBtnSidebar) {
        logoutBtnSidebar.addEventListener('click', signOutUser);
    }
    if (logoutBtnTop) { // Check if this button exists on the page
        logoutBtnTop.addEventListener('click', signOutUser);
    }
});
