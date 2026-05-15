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
        countLow: document.getElementById('countLow'),
        originalMarkup: document.getElementById('originalMarkup'),
        suggestedMarkup: document.getElementById('suggestedMarkup'),
        auditProgress: document.getElementById('auditProgress'),
        progressFill: document.getElementById('progressFill')
    };

    const API_URL = 'https://accessguard-ksri.onrender.com/api/audit';
    const BATCH_API_URL = 'https://accessguard-ksri.onrender.com/api/batch-audit';
    const HISTORY_URL = 'https://accessguard-ksri.onrender.com/api/history';

    const LOCAL_HISTORY_PREFIX = 'accessguard_history_';

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

        elements.heroStartBtn.addEventListener('click', () => {
            navigateTo('dashboard');
            showAuthReminderIfNeeded();
        });

        elements.heroAuditBtn.addEventListener('click', toggleBatchMode);

        elements.auditForm.addEventListener('submit', event => {
            event.preventDefault();
            handleAuditSubmit();
        });

        elements.batchBtn.addEventListener('click', handleBatchAudit);
        elements.refreshHistoryBtn.addEventListener('click', fetchAndRenderHistory);

        document.body.addEventListener('click', event => {
            const target = event.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const itemId = target.dataset.id;
            if (action === 'rerun') rerunSavedAudit(itemId);
            if (action === 'delete') deleteSavedAudit(itemId);
        });

        elements.protectedLinks.forEach(link => {
            link.addEventListener('click', event => {
                if (!isAuthenticated()) {
                    event.preventDefault();
                    openAuthModal();
                }
            });
        });
    }

    function route() {
        const rawHash = window.location.hash.slice(1) || 'home';
        let routeName = rawHash.split('?')[0];
        const protectedRoutes = ['dashboard', 'history'];

        if (!document.getElementById(routeName)) {
            routeName = 'home';
            window.location.hash = '#home';
        }

        if (protectedRoutes.includes(routeName) && !isAuthenticated()) {
            updateActiveSection('home');
            openAuthModal();
            setActiveNav('home');
            return;
        }

        updateActiveSection(routeName);
        setActiveNav(routeName);

        if (routeName === 'dashboard' && isAuthenticated()) {
            fetchAndRenderHistory();
        }

        if (routeName === 'history' && isAuthenticated()) {
            fetchAndRenderHistory();
        }
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

    function isAuthenticated() {
        return state.auth && state.auth.currentUser;
    }

    function handleAuthChange(user) {
        if (user) {
            updateAuthUI(user);
            if (window.location.hash === '#home' || window.location.hash === '') {
                navigateTo('dashboard');
            }
            closeAuthModal();
            fetchAndRenderHistory();
        } else {
            updateAuthUI(null);
            navigateTo('home');
        }
    }

    function updateAuthUI(user) {
        const loggedIn = Boolean(user);
        elements.authWelcome.classList.toggle('hidden', !loggedIn);
        elements.authAvatar.classList.toggle('hidden', !loggedIn);
        elements.authButton.textContent = loggedIn ? 'Logout' : 'Sign in with Google';
        elements.authButton.classList.toggle('btn-primary', !loggedIn);
        elements.authButton.classList.toggle('btn-ghost', loggedIn);
        elements.authWelcome.textContent = loggedIn ? `Hi, ${user.displayName || user.email}` : '';
        if (user && user.photoURL) {
            elements.authAvatar.style.backgroundImage = `url('${user.photoURL}')`;
        }
        elements.authButton.setAttribute('aria-label', loggedIn ? 'Logout' : 'Sign in with Google');
    }

    async function signInWithGoogle() {
        if (!state.auth) {
            showDashboardMessage('Firebase auth is not initialized.', 'warning');
            return;
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await state.auth.signInWithPopup(provider);
        } catch (error) {
            showDashboardMessage(error.message, 'warning');
        }
    }

    async function signOutUser() {
        if (!state.auth) return;
        try {
            await state.auth.signOut();
            state.currentAuditId = null;
            clearDashboard();
            showDashboardMessage('You have been signed out.');
        } catch (error) {
            showDashboardMessage(error.message, 'warning');
        }
    }

    function showAuthReminderIfNeeded() {
        if (!isAuthenticated()) {
            openAuthModal();
        }
    }

    function toggleBatchMode() {
        elements.batchWrapper.classList.toggle('hidden');
    }

    function handleAuditSubmit() {
        if (!isAuthenticated()) {
            openAuthModal();
            return;
        }
        const url = elements.urlInput.value.trim();
        if (!url) {
            showDashboardMessage('Please enter a valid URL.');
            return;
        }
        runAudit(url);
    }

    async function handleBatchAudit() {
        if (!isAuthenticated()) {
            openAuthModal();
            return;
        }
        const urls = elements.batchInput.value.split('\n').map(item => item.trim()).filter(Boolean);
        if (!urls.length) {
            showDashboardMessage('Add at least one URL to run a batch audit.');
            return;
        }
        await runBatchAudit(urls);
    }

    async function runAudit(url) {
        startAuditProgress();
        clearAuditResult();
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ url })
            });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: Ensure the backend is running.`);
            }
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Audit failed.');
            }
            state.currentAuditId = result.data.id;
            renderAuditResult(result.data, url);
            saveAuditHistory(result.data, url);
        } catch (error) {
            const errorMsg = error.message.includes('fetch') || error.message.includes('Network') 
                ? 'Unable to connect to the backend server. Please verify your connection or try again later.' 
                : error.message;
            showDashboardMessage(errorMsg, 'warning');
        } finally {
            completeAuditProgress();
        }
    }

    async function runBatchAudit(urls) {
        startAuditProgress();
        clearAuditResult();
        try {
            const response = await fetch(BATCH_API_URL, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ urls })
            });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: Ensure the backend is running.`);
            }
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Batch audit failed.');
            }
            renderBatchResult(result.data);
            elements.batchSection.classList.remove('hidden');
        } catch (error) {
            const errorMsg = error.message.includes('fetch') || error.message.includes('Network') 
                ? 'Unable to connect to the backend server. Please verify your connection or try again later.' 
                : error.message;
            showDashboardMessage(errorMsg, 'warning');
        } finally {
            completeAuditProgress();
        }
    }

    async function getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (state.auth?.currentUser) {
            try {
                const token = await state.auth.currentUser.getIdToken();
                headers.Authorization = `Bearer ${token}`;
            } catch (error) {
                console.warn('Failed to get auth token', error);
            }
        }
        return headers;
    }

    function renderAuditResult(data, url) {
        const summary = data.audit_summary || {};
        const issues = summary.severity_breakdown || {};
        elements.scoreValue.textContent = clampNumber(summary.score, 0, 100);
        elements.scoreCircle.setAttribute('stroke-dasharray', `${clampNumber(summary.score, 0, 100)}, 100`);
        elements.scoreCircle.style.stroke = getScoreColor(summary.score);
        elements.totalIssuesValue.textContent = summary.total_issues || 0;
        elements.countCritical.textContent = issues.Critical || 0;
        elements.countHigh.textContent = issues.High || 0;
        elements.countMedium.textContent = issues.Medium || 0;
        elements.countLow.textContent = issues.Low || 0;
        renderViolations(data.violations || []);
        renderRemediation(data);
        elements.scoreCard.classList.remove('hidden');
        elements.remediationCard.classList.remove('hidden');
        elements.violationsSection.classList.remove('hidden');
        elements.downloadPdfBtn.classList.remove('hidden');
        elements.downloadPdfBtn.onclick = () => window.open(`https://accessguard-ksri.onrender.com/api/report/${state.currentAuditId}`, '_blank');
        if (!elements.historyList.innerHTML.includes('history-card')) {
            fetchAndRenderHistory();
        }
    }

    function renderRemediation(data) {
        const original = data.metadata?.before_html || 'No original markup available.';
        const suggested = data.metadata?.after_html || data.remediation || 'No remediation preview available.';
        elements.originalMarkup.textContent = original;
        elements.suggestedMarkup.textContent = suggested;
    }

    function renderViolations(violations) {
        const container = document.getElementById('violationsList');
        container.innerHTML = '';
        if (!violations.length) {
            container.innerHTML = '<div class="violation-card"><p class="v-message">No accessibility violations were detected by the audit engine.</p></div>';
            return;
        }
        violations.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'violation-card';
            card.innerHTML = `
                <div class="violation-header">
                    <div class="v-rule">${escapeHtml(issue.rule || 'Unknown')}</div>
                    <span class="v-badge">${escapeHtml(issue.severity || 'Unknown')}</span>
                </div>
                <p class="v-message">${escapeHtml(issue.message || 'No details provided.')}</p>
                <div class="v-element-wrapper"><pre class="v-element">${escapeHtml(issue.element || '')}</pre></div>
            `;
            container.appendChild(card);
        });
    }

    function renderBatchResult(data) {
        const insights = data.comparative_insights || {};
        const ranking = data.ranking || [];
        const results = data.results || [];
        elements.batchInsights.innerHTML = `<p><strong>Best:</strong> ${escapeHtml(insights.best_site || '-')}&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Worst:</strong> ${escapeHtml(insights.worst_site || '-')}&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Avg Score:</strong> ${escapeHtml(insights.average_score ?? '-')}</p>`;
        elements.batchRanking.innerHTML = `<h3>Ranking</h3>${ranking.map(item => `<div class="batch-item"><strong>${escapeHtml(item.url)}</strong> · Score: ${escapeHtml(item.score)} · Issues: ${escapeHtml(item.total_issues)}</div>`).join('')}`;
        elements.batchList.innerHTML = `<h3>Results</h3>${results.map(item => `<div class="batch-item"><strong>${escapeHtml(item.url)}</strong> · Score: ${escapeHtml(item.score)} · Issues: ${escapeHtml(item.total_issues)}</div>`).join('')}`;
    }

    function startAuditProgress() {
        state.runningAudit = true;
        elements.auditProgress.classList.remove('hidden');
        elements.progressFill.style.width = '20%';
        showDashboardMessage('Audit started...', 'info');
    }

    function completeAuditProgress() {
        state.runningAudit = false;
        elements.progressFill.style.width = '100%';
        setTimeout(() => {
            if (!state.runningAudit) {
                elements.auditProgress.classList.add('hidden');
                elements.progressFill.style.width = '0%';
            }
        }, 600);
    }

    function clearAuditResult() {
        elements.scoreCard.classList.add('hidden');
        elements.remediationCard.classList.add('hidden');
        elements.violationsSection.classList.add('hidden');
        elements.downloadPdfBtn.classList.add('hidden');
    }

    function showDashboardMessage(message, level = 'info') {
        elements.authMessage.textContent = message;
        elements.authMessage.classList.remove('hidden', 'warning');
        if (level === 'warning') {
            elements.authMessage.classList.add('warning');
        }
    }

    function fetchAndRenderHistory() {
        if (!isAuthenticated()) return;
        renderSavedHistory();
        fetchRemoteHistory();
    }

    async function fetchRemoteHistory() {
        try {
            const response = await fetch(HISTORY_URL, { headers: await getAuthHeaders() });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Unable to load remote history.');
            }
            renderRemoteHistory(result.data || []);
        } catch (error) {
            console.warn('History fetch failed:', error.message);
        }
    }

    function renderSavedHistory() {
        const history = loadHistory();
        if (!history.length) {
            elements.historyList.innerHTML = '<div class="history-card"><div class="history-meta"><strong>No saved audits yet</strong><p>Run an audit to populate your user-specific session history.</p></div></div>';
            return;
        }

        elements.historyList.innerHTML = history.map(item => `
            <div class="history-card">
                <div class="history-meta">
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.url)}</p>
                    <p>${escapeHtml(item.score)} score · ${escapeHtml(item.total_issues)} issues · ${escapeHtml(new Date(item.timestamp).toLocaleString())}</p>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary" data-action="rerun" data-id="${escapeHtml(item.id)}">Re-run</button>
                    <button class="btn btn-ghost" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function renderRemoteHistory(items) {
        if (!items.length) return;
        const remoteHeader = document.createElement('div');
        remoteHeader.className = 'history-card';
        remoteHeader.innerHTML = `<div class="history-meta"><strong>Backend audit history</strong><p>Recent audit records from the Render API.</p></div>`;
        elements.historyList.appendChild(remoteHeader);
        const table = document.createElement('div');
        table.innerHTML = `<div class="history-card" style="overflow-x:auto;"><table class="history-table"><thead><tr><th>ID</th><th>URL</th><th>Score</th><th>Issues</th><th>Date</th><th>Report</th></tr></thead><tbody>${items.map(item => `
                <tr>
                    <td>${escapeHtml(item.id)}</td>
                    <td><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a></td>
                    <td>${escapeHtml(item.score)}</td>
                    <td>${escapeHtml(item.total_issues)}</td>
                    <td>${escapeHtml(new Date(item.timestamp).toLocaleString())}</td>
                    <td><a href="https://accessguard-ksri.onrender.com/api/report/${escapeHtml(item.id)}" target="_blank">Report</a></td>
                </tr>`).join('')}</tbody></table></div>`;
        elements.historyList.appendChild(table);
    }

    function rerunSavedAudit(id) {
        const audit = loadHistory().find(item => item.id === id);
        if (!audit) return;
        navigateTo('dashboard');
        elements.urlInput.value = audit.url;
        runAudit(audit.url);
    }

    function deleteSavedAudit(id) {
        if (!isAuthenticated()) return;
        const key = getHistoryKey();
        const history = loadHistory().filter(item => item.id !== id);
        localStorage.setItem(key, JSON.stringify(history));
        renderSavedHistory();
    }

    function saveAuditHistory(data, url) {
        if (!isAuthenticated()) return;
        const entry = {
            id: `${data.id || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            url,
            title: data.metadata?.title || url,
            score: data.audit_summary?.score || 0,
            total_issues: data.audit_summary?.total_issues || 0,
            timestamp: new Date().toISOString()
        };
        const history = loadHistory().filter(item => item.url !== url);
        history.unshift(entry);
        localStorage.setItem(getHistoryKey(), JSON.stringify(history.slice(0, 25)));
        renderSavedHistory();
    }

    function loadHistory() {
        if (!isAuthenticated()) return [];
        try {
            return JSON.parse(localStorage.getItem(getHistoryKey()) || '[]');
        } catch (error) {
            return [];
        }
    }

    function getHistoryKey() {
        return `${LOCAL_HISTORY_PREFIX}${state.auth?.currentUser?.uid || 'anonymous'}`;
    }

    function clearDashboard() {
        clearAuditResult();
        elements.historyList.innerHTML = '';
        elements.authAvatar.style.backgroundImage = '';
    }

    function clampNumber(value, min, max) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? Math.min(Math.max(numeric, min), max) : min;
    }

    function getScoreColor(score) {
        if (score >= 90) return 'var(--success)';
        if (score >= 70) return 'var(--warning)';
        return 'var(--danger)';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});
