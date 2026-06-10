document.addEventListener('DOMContentLoaded', () => {
    AUTH.redirectIfNotAuthenticated();

    const state = {
        currentAuditId: null,
        runningAudit: false,
    };

    const elements = {
        pageSections: document.querySelectorAll('.route-section'),
        navLinks: document.querySelectorAll('.nav-link'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        siteNav: document.getElementById('siteNav'),
        authButton: document.getElementById('authButton'),
        authWelcome: document.getElementById('authWelcome'),
        authAvatar: document.getElementById('authAvatar'),
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
        violationsList: document.getElementById('violationsList'),
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
        progressFill: document.getElementById('progressFill'),
    };

    init();

    function init() {
        renderUser();
        bindEvents();
        route();
        window.addEventListener('hashchange', route);
    }

    function renderUser() {
        const user = AUTH.getUser();
        if (user) {
            elements.authWelcome.textContent = `Hi, ${user.name || 'User'}`;
            elements.authAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
            elements.authAvatar.classList.remove('hidden');
            elements.authWelcome.classList.remove('hidden');
            elements.authButton.textContent = 'Logout';
        }
    }

    function bindEvents() {
        elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);

        elements.authButton.addEventListener('click', () => {
            AUTH.logout();
        });

        elements.heroAuditBtn.addEventListener('click', toggleBatchMode);

        elements.auditForm.addEventListener('submit', event => {
            event.preventDefault();
            handleAuditSubmit();
        });

        elements.batchBtn.addEventListener('click', runBatchAudit);
        elements.refreshHistoryBtn.addEventListener('click', fetchAndRenderHistory);

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const savedTheme = localStorage.getItem('ag_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeIcon.textContent = savedTheme === 'light' ? '☀️' : '🌙';
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('ag_theme', next);
            themeIcon.textContent = next === 'light' ? '☀️' : '🌙';
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

        if (routeName === 'dashboard' || routeName === 'history') {
            fetchAndRenderHistory();
        }
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
            runAudit(url);
        } else {
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

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            elements.progressFill.style.width = `${progress}%`;
        }, 200);

        AUTH.apiPost('/api/audit', { url })
            .then(responseData => {
                if (responseData.status === 'error') {
                    throw new Error(responseData.message || 'Backend API error');
                }

                const payload = responseData.data || responseData;

                const formattedData = {
                    id: payload.id,
                    score: payload.audit_summary?.score,
                    violations: payload.violations?.map(v => ({
                        ...v,
                        suggestion: v.ai_suggestion || v.suggestion,
                    })) || [],
                    remediation: payload.violations?.filter(v => v.before_html && v.after_html).map(v => ({
                        original: v.before_html,
                        suggestion: v.after_html,
                    })) || [],
                };

                state.currentAuditId = payload.id;

                clearInterval(progressInterval);
                elements.progressFill.style.width = '100%';
                setTimeout(() => {
                    renderAuditResult(formattedData, url);
                    state.runningAudit = false;
                    elements.submitBtn.disabled = false;
                    elements.submitBtn.textContent = 'Run Audit';
                    elements.auditProgress.classList.add('hidden');
                }, 500);
            })
            .catch(error => {
                clearInterval(progressInterval);
                alert('Audit failed: ' + error.message);
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

        AUTH.apiPost('/api/batch-audit', { urls })
            .then(responseData => {
                if (responseData.status === 'error') {
                    throw new Error(responseData.message || 'Backend API error');
                }

                const payload = responseData.data || responseData;
                const formattedBatchData = {
                    results: payload.results,
                    ranking: payload.ranking,
                    insights: payload.comparative_insights
                        ? `Best Site: ${payload.comparative_insights.best_site} | Avg Score: ${payload.comparative_insights.average_score}`
                        : '',
                };

                renderBatchResult(formattedBatchData);
                state.runningAudit = false;
                elements.batchBtn.disabled = false;
                elements.batchBtn.textContent = 'Run Batch Audit';
            })
            .catch(error => {
                alert('Batch audit failed: ' + error.message);
                state.runningAudit = false;
                elements.batchBtn.disabled = false;
                elements.batchBtn.textContent = 'Run Batch Audit';
            });
    }

    function renderAuditResult(data, url) {
        elements.scoreCard.classList.add('hidden');
        elements.remediationCard.classList.add('hidden');
        elements.violationsSection.classList.add('hidden');
        elements.downloadPdfBtn.classList.add('hidden');

        if (data.score !== undefined) {
            const score = Math.min(100, Math.max(0, Math.round(Number(data.score))));
            elements.scoreValue.textContent = score;
            const r = 15.9155;
            const c = 2 * Math.PI * r;
            const offset = c - (score / 100) * c;
            elements.scoreCircle.style.strokeDasharray = c;
            elements.scoreCircle.style.strokeDashoffset = offset;
            elements.scoreCard.classList.remove('hidden');
        }

        elements.totalIssuesValue.textContent = data.violations?.length || 0;
        const sev = s => (s || '').toLowerCase();
        elements.countCritical.textContent = data.violations?.filter(v => sev(v.severity) === 'critical').length || 0;
        elements.countHigh.textContent = data.violations?.filter(v => sev(v.severity) === 'high').length || 0;
        elements.countMedium.textContent = data.violations?.filter(v => sev(v.severity) === 'medium').length || 0;
        elements.countLow.textContent = data.violations?.filter(v => sev(v.severity) === 'low').length || 0;

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

        if (data.score !== undefined || (data.violations && data.violations.length > 0)) {
            elements.downloadPdfBtn.classList.remove('hidden');
            elements.downloadPdfBtn.onclick = () => downloadPdfReport(data.id);
        }
    }

    function renderBatchResult(data) {
        elements.batchSection.classList.remove('hidden');

        if (data.insights) {
            elements.batchInsights.innerHTML = `<p>${data.insights}</p>`;
        }

        if (data.ranking) {
            const rankingHtml = data.ranking.map(item =>
                `<div class="ranking-item">
                    <span class="ranking-url">${item.url}</span>
                    <span class="ranking-score">${item.score}</span>
                </div>`
            ).join('');
            elements.batchRanking.innerHTML = rankingHtml;
        }

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
        elements.violationsList.innerHTML = '';

        if (!violations || violations.length === 0) {
            elements.violationsList.innerHTML = `
                <div class="no-issues">
                    Excellent! No accessibility violations were detected.
                </div>
            `;
            return;
        }

        const violationsHtml = violations.map(v => {
            const safeElement = v.element ? v.element.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
            const formattedRule = v.rule ? v.rule.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN RULE';
            const sev = (v.severity || '').toLowerCase();

            return `
                <div class="violation-card sev-${sev}">
                    <div class="violation-header">
                        <div class="v-rule">${formattedRule}</div>
                        <div class="v-badge">${sev}</div>
                    </div>
                    <div class="v-message">${v.message || ''}</div>
                    ${safeElement ? `
                    <div class="v-element-wrapper">
                        <pre class="v-element">${safeElement}</pre>
                    </div>` : ''}
                    ${v.suggestion ? `<div class="v-message" style="margin-top: 0.8rem;"><strong>Suggestion:</strong> ${v.suggestion}</div>` : ''}
                </div>
            `;
        }).join('');

        elements.violationsList.innerHTML = violationsHtml;
    }

    function fetchAndRenderHistory() {
        AUTH.apiGet('/api/history')
            .then(responseData => {
                const history = responseData.data || [];
                renderHistory(history);
            })
            .catch(() => {
                elements.historyList.innerHTML = '<p class="empty-state">Failed to load history.</p>';
            });
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
                        <span class="history-violations">Issues: ${item.total_issues}</span>
                        <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#dashboard'; document.getElementById('urlInput').value='${item.url}'">Rerun</button>
                </div>
            </div>
        `).join('');

        elements.historyList.innerHTML = historyHtml;
    }

    function downloadPdfReport(auditId) {
        if (!auditId) {
            alert('No audit ID available for PDF download.');
            return;
        }
        const token = AUTH.getToken();
        const url = `${AUTH.API_URL}/api/report/${auditId}`;
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_report_${auditId}.pdf`);
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.responseType = 'blob';
        xhr.onload = function () {
            if (this.status === 200) {
                const blob = this.response;
                const blobUrl = window.URL.createObjectURL(blob);
                link.href = blobUrl;
                link.click();
                window.URL.revokeObjectURL(blobUrl);
            } else {
                alert('Failed to download PDF report.');
            }
        };
        xhr.send();
    }
});
