window.AUTH = (() => {
    const API_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? 'http://127.0.0.1:8765'
        : 'https://accessguard-ksri.onrender.com';
    const TOKEN_KEY = 'accessguard_token';
    const USER_KEY = 'accessguard_user';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function isAuthenticated() {
        return !!getToken();
    }

    function saveAuth(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function logout() {
        clearAuth();
        window.location.href = '/login.html';
    }

    function getAuthHeaders() {
        const token = getToken();
        return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }

    async function apiPost(path, body) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || 'Request failed');
        }
        return data;
    }

    async function apiGet(path) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || 'Request failed');
        }
        return data;
    }

    async function login(email, password) {
        const result = await apiPost('/api/auth/login', { email, password });
        saveAuth(result.token, result.user);
        return result;
    }

    async function register(name, email, password) {
        const result = await apiPost('/api/auth/register', { name, email, password });
        saveAuth(result.token, result.user);
        return result;
    }

    async function googleAuth(googleToken) {
        const result = await apiPost('/api/auth/google', { google_token: googleToken });
        saveAuth(result.token, result.user);
        return result;
    }

    function redirectIfAuthenticated() {
        if (isAuthenticated()) {
            window.location.href = '/dashboard.html';
        }
    }

    function redirectIfNotAuthenticated() {
        if (!isAuthenticated()) {
            window.location.href = '/login.html';
        }
    }

    function initGoogleSignIn(buttonId, callback) {
        const el = document.getElementById(buttonId);
        if (!el) return;

        function tryRender() {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                setTimeout(tryRender, 300);
                return;
            }
            google.accounts.id.initialize({
                client_id: window.GOOGLE_CLIENT_ID,
                callback: async (response) => {
                    try {
                        const result = await googleAuth(response.credential);
                        if (callback) callback(null, result);
                    } catch (err) {
                        if (callback) callback(err, null);
                    }
                },
            });
            google.accounts.id.renderButton(el, {
                theme: 'outline',
                size: 'large',
                width: 320,
                shape: 'pill',
            });
        }
        tryRender();
    }

    return {
        getToken,
        getUser,
        isAuthenticated,
        saveAuth,
        clearAuth,
        logout,
        getAuthHeaders,
        apiPost,
        apiGet,
        login,
        register,
        googleAuth,
        redirectIfAuthenticated,
        redirectIfNotAuthenticated,
        initGoogleSignIn,
        API_URL,
    };
})();
