/**
 * ProcureX Frontend API & Navigation Handler
 */

// Define Backend API Endpoint (Configured for Railway and local fallback)
const API = window.CUSTOM_API_URL || '../api.php';

// Helper to get Auth Token from LocalStorage
function getAuthToken() {
    return localStorage.getItem('procurex_token') || localStorage.getItem('token');
}

// Helper to get Logged In User
function getAuthUser() {
    try {
        const userStr = localStorage.getItem('procurex_user') || localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch(e) {
        return null;
    }
}

// Universal API Fetcher
async function callApi(action, method = 'GET', body = null) {
    showSpinner(true);
    try {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const options = {
            method: method,
            headers: headers
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }

        const url = `${API}?action=${action}`;
        const response = await fetch(url, options);

        let data;
        try {
            data = await response.json();
        } catch (err) {
            throw new Error('Invalid JSON response from server.');
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || `API Request Failed (${response.status})`);
        }

        return data;
    } catch (error) {
        showToast(error.message, true);
        throw error;
    } finally {
        showSpinner(false);
    }
}

// Toast notification helper
function showToast(message, isError = false) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
        <span>${isError ? '⚠️' : '✅'}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Loading Spinner Helper
function showSpinner(show) {
    let spinner = document.querySelector('.spinner-overlay');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

// Format Money Helper (INR)
function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount || 0);
}

// Check Authentication for Protected Pages
function checkAuth() {
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes('login.html') || path.includes('register.html');
    const token = getAuthToken();

    if (!token && !isAuthPage) {
        window.location.href = 'login.html';
    } else if (token && isAuthPage) {
        window.location.href = 'home.html';
    }
}

// Logout Handler
function logout() {
    localStorage.removeItem('procurex_token');
    localStorage.removeItem('procurex_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Render Navigation & User Details on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Attach logout button handler if present
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Set User Name in Header
    const user = getAuthUser();
    const userNameEl = document.getElementById('headerUserName');
    const userAvatarEl = document.getElementById('headerUserAvatar');

    if (user) {
        if (userNameEl) userNameEl.textContent = user.name || 'User';
        if (userAvatarEl) userAvatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }
});
