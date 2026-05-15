/*
  AccessGuard landing page application
  Handles routing between sections and Firebase authentication.
*/

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        auth: null
    };

    const elements = {
        pageSections: document.querySelectorAll('.route-section'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        siteNav: document.getElementById('siteNav'),
        authButton: document.getElementById('authButton'),
        heroSignInBtn: document.getElementById('heroSignInBtn'),
        modalSignInBtn: document.getElementById('modalSignInBtn'),
        authModal: document.getElementById('authModal'),
        closeAuthModal: document.getElementById('closeAuthModal'),
        authWelcome: document.getElementById('authWelcome'),
        authAvatar: document.getElementById('authAvatar')
    };

    init();

    function init() {
        initFirebase();
        bindEvents();
        route();
        window.addEventListener('hashchange', route);
    }

    function initFirebase() {
        if (!window.firebase || !window.FIREBASE_CONFIG) {
            console.warn('Firebase config missing. Please populate firebase-config.js with your values.');
            return;
        }

        firebase.initializeApp(window.FIREBASE_CONFIG);
        const auth = firebase.auth();
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        auth.onAuthStateChanged(handleAuthChange);
        state.auth = auth;
    }

    function bindEvents() {
        elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);

        elements.authButton.addEventListener('click', () => {
            if (elements.authButton.textContent.includes('Logout')) {
                signOutUser();
            } else {
                openAuthModal();
            }
        });

        elements.heroSignInBtn.addEventListener('click', openAuthModal);
        elements.modalSignInBtn.addEventListener('click', signInWithGoogle);
        elements.closeAuthModal.addEventListener('click', closeAuthModal);
        elements.authModal.addEventListener('click', event => {
            if (event.target === elements.authModal) {
                closeAuthModal();
            }
        });
    }

    function route() {
        const rawHash = window.location.hash.slice(1) || 'home';
        let routeName = rawHash.split('?')[0];

        if (!document.getElementById(routeName)) {
            routeName = 'home';
            window.location.hash = '#home';
        }

        updateActiveSection(routeName);
        setActiveNav(routeName);
    }

    function navigateTo(route) {
        window.location.hash = `#${route}`;
    }

    function updateActiveSection(route) {
        elements.pageSections.forEach(section => {
            section.classList.toggle('hidden', section.id !== route);
        });
    }

    function setActiveNav(route) {
        elements.navLinks.forEach(link => {
            const hrefRoute = link.getAttribute('href').slice(1);
            link.classList.toggle('active', hrefRoute === route);
        });
        closeMobileMenu();
    }

    function toggleMobileMenu() {
        elements.siteNav.classList.toggle('open');
    }

    function closeMobileMenu() {
        elements.siteNav.classList.remove('open');
    }

    function openAuthModal() {
        elements.authModal.classList.remove('hidden');
        elements.authModal.setAttribute('aria-hidden', 'false');
    }

    function closeAuthModal() {
        elements.authModal.classList.add('hidden');
        elements.authModal.setAttribute('aria-hidden', 'true');
    }

    function signInWithGoogle() {
        if (!state.auth) return;

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        state.auth.signInWithPopup(provider).catch(error => {
            console.error('Auth error:', error);
            alert('Authentication failed. Please try again.');
        });
    }

    function signOutUser() {
        if (!state.auth) return;
        state.auth.signOut();
    }

    function handleAuthChange(user) {
        if (user) {
            // User is signed in
            elements.authWelcome.textContent = `Hi, ${user.displayName || 'User'}`;
            elements.authAvatar.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
            elements.authAvatar.classList.remove('hidden');
            elements.authWelcome.classList.remove('hidden');
            elements.authButton.textContent = 'Logout';
        } else {
            // User is signed out
            elements.authWelcome.textContent = '';
            elements.authAvatar.textContent = '';
            elements.authAvatar.classList.add('hidden');
            elements.authWelcome.classList.add('hidden');
            elements.authButton.textContent = 'Sign in with Google';
        }
    }

    function isAuthenticated() {
        return !!state.auth?.currentUser;
    }
});
