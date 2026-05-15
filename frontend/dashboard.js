/*
  AccessGuard dashboard application
  Handles routing, Firebase authentication, audit execution, and local history.
*/

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        auth: null,
        currentAuditId: null,
        runningAudit: false
    };

    const elements = {
        pageSections: document.querySelectorAll('.route-section'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        siteNav: document.getElementById('siteNav'),
        authButton: document.getElementById('authButton'),
        modalSignInBtn: document.getElementById('modalSignInBtn'),
        authModal: document.getElementById('authModal'),
        closeAuthModal: document.getElementById('closeAuthModal'),
        authWelcome: document.getElementById('authWelcome'),
        authAvatar: document.getElementById('authAvatar'),
        authMessage: document.getElementById('dashboardMessage'),
        auditForm: document.getElementById('auditForm'),
        urlInput: document.getElementById('urlInput'),
        submitBtn: document.getElementById('submitBtn'),
        heroAuditBtn: document.getElementById('heroAuditBtn'),
        batchWrapper: document.getElementById('batchWrapper'),
        batchBtn: document.getElementById('batchBtn'),
        batchInput: document.getElementById('batchInput'),
        batchSection: document.getElementById('batchSection'),
        batchInsights: document.getElementById('batchInsights'),
        batchRanking: document.getElementById('batchRanking'),
        batchList: document.getElementById('batchList'),
        refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
        historyList: document.getElementById('historyList'),
        downloadPdfBtn: document.getElementById('downloadPdfBtn'),
        scoreCard: document.getElementById('scoreCard'),
        remediationCard: document.getElementById('remediationCard'),
        violationsSection: document.getElementById('violationsSection'),
        scoreValue: document.getElementById('scoreValue'),
        scoreCircle: document.getElementById('scoreCircle'),
        totalIssuesValue: document.getElementById('totalIssuesValue'),
        countCritical: document.getElementById('countCritical'),
        countHigh: document.getElementById('countHigh'),
        countMedium: document.getElementById('countMedium'),
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

        elements.modalSignInBtn.addEventListener('click', signInWithGoogle);
        elements.closeAuthModal.addEventListener('click', closeAuthModal);
        elements.authModal.addEventListener('click', event => {
            if (event.target === elements.authModal) {
                closeAuthModal();
            }
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
    }

    function route() {
        const rawHash = window.location.hash.slice(1) || 'dashboard';
        let routeName = rawHash.split('?')[0];

        if (!document.getElementById(routeName)) {
            routeName = 'dashboard';
            window.location.hash = '#dashboard';
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
        window.location.href = 'index.html';
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
            // User is signed out - redirect to landing page
            window.location.href = 'index.html';
        }
    }

    function isAuthenticated() {
        return !!state.auth?.currentUser;
    }

    function toggleBatchMode() {
        const isBatch = !elements.batchWrapper.classList.contains('hidden');
        elements.batchWrapper.classList.toggle('hidden', isBatch);
        elements.heroAuditBtn.textContent = isBatch ? 'Batch Audit' : 'Single Audit';
        elements.submitBtn.textContent = isBatch ? 'Run Batch Audit' : 'Run Audit';
    }

    function handleAuditSubmit() {
        if (state.runningAudit) return;

        const url = elements.urlInput.value.trim();
        if (!url) return;

        if (elements.batchWrapper.classList.contains('hidden')) {
            // Single audit
            runAudit(url);
        } else {
            // Batch audit
            const batchUrls = elements.batchInput.value.trim().split('\n').filter(u => u.trim());
            if (batchUrls.length === 0) return;
            runBatchAudit(batchUrls);
        }
    }

    function runAudit(url) {
        if (state.runningAudit) return;
        state.runningAudit = true;

        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = 'Running...';
        elements.auditProgress.classList.remove('hidden');
        elements.progressFill.style.width = '0%';

        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            elements.progressFill.style.width = `${progress}%`;
        }, 200);

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: Ensure the backend is running.`);
            }
            return response.json();
        })
        .then(data => {
            clearInterval(progressInterval);
            elements.progressFill.style.width = '100%';
            setTimeout(() => {
                renderAuditResult(data, url);
                state.runningAudit = false;
                elements.submitBtn.disabled = false;
                elements.submitBtn.textContent = 'Run Audit';
                elements.auditProgress.classList.add('hidden');
            }, 500);
        })
        .catch(error => {
            clearInterval(progressInterval);
            console.error('Audit error:', error);
            alert('Audit failed. Please try again.');
            state.runningAudit = false;
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = 'Run Audit';
            elements.auditProgress.classList.add('hidden');
        });
    }

    function runBatchAudit(urls) {
        if (state.runningAudit) return;
        state.runningAudit = true;

        elements.batchBtn.disabled = true;
        elements.batchBtn.textContent = 'Running...';

        fetch(BATCH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: Ensure the backend is running.`);
            }
            return response.json();
        })
        .then(data => {
            renderBatchResult(data);
            state.runningAudit = false;
            elements.batchBtn.disabled = false;
            elements.batchBtn.textContent = 'Run Batch Audit';
        })
        .catch(error => {
            console.error('Batch audit error:', error);
            alert('Batch audit failed. Please try again.');
            state.runningAudit = false;
            elements.batchBtn.disabled = false;
            elements.batchBtn.textContent = 'Run Batch Audit';
        });
    }

    function renderAuditResult(data, url) {
        // Reset previous results
        elements.scoreCard.classList.add('hidden');
        elements.remediationCard.classList.add('hidden');
        elements.violationsSection.classList.add('hidden');
        elements.downloadPdfBtn.classList.add('hidden');

        if (data.score !== undefined) {
            elements.scoreValue.textContent = data.score;
            elements.scoreCircle.style.strokeDasharray = `${data.score}, 100`;
            elements.scoreCard.classList.remove('hidden');
        }

        // Update stats
        elements.totalIssuesValue.textContent = data.violations?.length || 0;
        elements.countCritical.textContent = data.violations?.filter(v => v.severity === 'critical').length || 0;
        elements.countHigh.textContent = data.violations?.filter(v => v.severity === 'high').length || 0;
        elements.countMedium.textContent = data.violations?.filter(v => v.severity === 'medium').length || 0;
        elements.countLow.textContent = data.violations?.filter(v => v.severity === 'low').length || 0;

        if (data.remediation && data.remediation.length > 0) {
            const remediation = data.remediation[0];
            elements.originalMarkup.textContent = remediation.original || 'No original markup available.';
            elements.suggestedMarkup.textContent = remediation.suggestion || 'No suggestion available.';
            elements.remediationCard.classList.remove('hidden');
        }

        if (data.violations && data.violations.length > 0) {
            renderViolations(data.violations);
            elements.violationsSection.classList.remove('hidden');
        }

        // Save to local history
        if (isAuthenticated()) {
            saveAuditToHistory(data, url);
        }

        // Show download button if we have results
        if (data.score !== undefined || (data.violations && data.violations.length > 0)) {
            elements.downloadPdfBtn.classList.remove('hidden');
            elements.downloadPdfBtn.onclick = () => downloadPdfReport(data, url);
        }
    }

    function renderBatchResult(data) {
        elements.batchSection.classList.remove('hidden');

        // Render insights
        if (data.insights) {
            elements.batchInsights.innerHTML = `<p>${data.insights}</p>`;
        }

        // Render ranking
        if (data.ranking) {
            const rankingHtml = data.ranking.map(item =>
                `<div class="ranking-item">
                    <span class="ranking-url">${item.url}</span>
                    <span class="ranking-score">${item.score}</span>
                </div>`
            ).join('');
            elements.batchRanking.innerHTML = rankingHtml;
        }

        // Render detailed results
        if (data.results) {
            const resultsHtml = data.results.map(result =>
                `<div class="batch-result-item">
                    <h4>${result.url}</h4>
                    <p>Score: ${result.score || 'N/A'}</p>
                    <p>Issues: ${result.violations?.length || 0}</p>
                </div>`
            ).join('');
            elements.batchList.innerHTML = resultsHtml;
        }
    }

    function renderViolations(violations) {
        const violationsHtml = violations.map(violation => `
            <div class="violation-card severity-${violation.severity}">
                <div class="violation-header">
                    <span class="violation-severity">${violation.severity}</span>
                    <h4>${violation.title}</h4>
                </div>
                <p class="violation-description">${violation.description}</p>
                ${violation.element ? `<code class="violation-element">${violation.element}</code>` : ''}
                ${violation.suggestion ? `<p class="violation-suggestion"><strong>Suggestion:</strong> ${violation.suggestion}</p>` : ''}
            </div>
        `).join('');

        elements.violationsList.innerHTML = violationsHtml;
    }

    function saveAuditToHistory(data, url) {
        if (!isAuthenticated()) return;

        const userId = state.auth.currentUser.uid;
        const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

        const auditEntry = {
            id: Date.now().toString(),
            url,
            timestamp: new Date().toISOString(),
            score: data.score,
            violationsCount: data.violations?.length || 0,
            data
        };

        history.unshift(auditEntry);
        if (history.length > 50) history.splice(50); // Keep only last 50

        localStorage.setItem(historyKey, JSON.stringify(history));
    }

    function fetchAndRenderHistory() {
        if (!isAuthenticated()) return;

        const userId = state.auth.currentUser.uid;
        const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

        renderHistory(history);
    }

    function renderHistory(history) {
        if (history.length === 0) {
            elements.historyList.innerHTML = '<p class="empty-state">No audit history yet. Run your first audit to get started!</p>';
            return;
        }

        const historyHtml = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-content">
                    <div class="history-url">${item.url}</div>
                    <div class="history-meta">
                        <span class="history-score">Score: ${item.score || 'N/A'}</span>
                        <span class="history-violations">Issues: ${item.violationsCount}</span>
                        <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-ghost btn-sm" data-action="rerun" data-id="${item.id}">Rerun</button>
                    <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `).join('');

        elements.historyList.innerHTML = historyHtml;
    }

    function rerunSavedAudit(itemId) {
        if (!isAuthenticated()) return;

        const userId = state.auth.currentUser.uid;
        const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        const item = history.find(h => h.id === itemId);

        if (item) {
            elements.urlInput.value = item.url;
            navigateTo('dashboard');
            runAudit(item.url);
        }
    }

    function deleteSavedAudit(itemId) {
        if (!isAuthenticated()) return;

        const userId = state.auth.currentUser.uid;
        const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
        let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        history = history.filter(h => h.id !== itemId);

        localStorage.setItem(historyKey, JSON.stringify(history));
        fetchAndRenderHistory();
    }

    function downloadPdfReport(data, url) {
        // This would integrate with the PDF generation endpoint
        alert('PDF report download would be implemented here with the backend PDF endpoint.');
    }
});