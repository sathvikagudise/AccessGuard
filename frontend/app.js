document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('auditForm');
    const urlInput = document.getElementById('urlInput');
    const submitBtn = document.getElementById('submitBtn');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const resultsSection = document.getElementById('resultsSection');

    // API URL matches Phase 1-4 backend. Using absolute paths for local file:// frontend
    const API_URL = 'https://accessguard-backend.onrender.com/api/audit';
    const BATCH_API_URL = 'https://accessguard-backend.onrender.com/api/batch-audit';

    // Batch UI Elements
    const batchForm = document.getElementById('batchForm');
    const batchInput = document.getElementById('batchInput');
    const batchSection = document.getElementById('batchSection');
    const batchInsights = document.getElementById('batchInsights');
    const batchRanking = document.getElementById('batchRanking');
    const batchList = document.getElementById('batchList');

    // UI Elements for Data binding
    const scoreValue = document.getElementById('scoreValue');
    const scoreCircle = document.getElementById('scoreCircle');
    const totalIssuesValue = document.getElementById('totalIssuesValue');
    const scrapedTitle = document.getElementById('scrapedTitle');

    const countCritical = document.getElementById('countCritical');
    const countHigh = document.getElementById('countHigh');
    const countMedium = document.getElementById('countMedium');
    const countLow = document.getElementById('countLow');

    const violationsList = document.getElementById('violationsList');

    // NEW: PDF Download Button Reference
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');

    let currentAuditId = null; // Store the latest successfully generated DB audit ID

    refreshHistoryBtn.addEventListener('click', () => {
        fetchAndRenderHistory();
    });

    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetUrl = urlInput.value.trim();
        if (!targetUrl) return;

        // 1. Setup Loading State
        setLoadingState(true);
        hideElements([resultsSection, batchSection, errorMessage, downloadPdfBtn]);

        try {
            // 2. Fetch API dynamically
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: targetUrl })
            });

            const result = await response.json();

            // 3. Handle Backend Error Responses cleanly
            if (result.status === 'error') {
                throw new Error(result.message);
            }

            // Store the ID returned from SQLite
            currentAuditId = result.data.id;

            // 4. Render the purely dynamic response DOM
            renderDashboard(result.data);

            // 5. Reveal PDF button
            if (currentAuditId) {
                downloadPdfBtn.classList.remove('hidden');
            }

        } catch (error) {
            showError(`Audit Failed: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    });

    // Handle PDF Download Click
    downloadPdfBtn.addEventListener('click', () => {
        if (!currentAuditId) return;

        // This triggers the browser native download process hitting our FastAPI backend endpoint.
        const downloadUrl = `https://accessguard-backend.onrender.com/api/report/${currentAuditId}`;
        window.open(downloadUrl, '_blank');
    });

    batchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const lines = batchInput.value.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        setLoadingState(true);
        hideElements([resultsSection, batchSection, errorMessage, downloadPdfBtn]);

        try {
            const response = await fetch(BATCH_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ urls: lines })
            });

            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Batch audit failed.');
            }

            renderBatchResults(result.data);
            batchSection.classList.remove('hidden');
            batchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            showError(`Batch Audit Failed: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    });

    function renderBatchResults(data) {
        const insights = data.comparative_insights || {};
        const ranking = data.ranking || [];
        const results = data.results || [];

        batchInsights.innerHTML = `<p><strong>Best:</strong> ${insights.best_site || '-'} | <strong>Worst:</strong> ${insights.worst_site || '-'} | <strong>Avg Score:</strong> ${insights.average_score ?? '-'} </p>`;
        batchRanking.innerHTML = `<h3>Ranking</h3>${ranking.map(r => `<div>${r.rank}. ${r.url} - ${r.score}</div>`).join('')}`;
        batchList.innerHTML = `<h3>Results</h3>${results.map(r => `<div style='margin-bottom:.5rem;padding:.3rem;background:#111;color:#fff;border-radius:6px;'><strong>${r.url}</strong> → Score: ${r.score} | Issues: ${r.total_issues}</div>`).join('')}`;
    }

    function setLoadingState(isLoading) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    }

    function hideElements(elements) {
        elements.forEach(el => el.classList.add('hidden'));
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function renderDashboard(data) {
        const summary = data.audit_summary;
        const issues = summary.severity_breakdown;

        // Render Top Metrics
        animateScore(summary.score);
        totalIssuesValue.textContent = summary.total_issues;
        scrapedTitle.textContent = `Scraped: ${data.metadata.title}`;

        // Render Severity Grid
        countCritical.textContent = issues.Critical || 0;
        countHigh.textContent = issues.High || 0;
        countMedium.textContent = issues.Medium || 0;
        countLow.textContent = issues.Low || 0;

        // Render Violation DOM list
        renderViolationsList(data.violations);

        // Reveal the complete dynamic results section smoothly
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function animateScore(score) {
        const safeScore = Math.max(0, Math.min(100, score));
        scoreValue.textContent = safeScore;

        // Calculate stroke-dasharray (percentage of circle)
        // circle path length = 100
        scoreCircle.setAttribute('stroke-dasharray', `${safeScore}, 100`);

        // Determine animated color logically
        let strokeColor = 'var(--score-bad)';
        if (safeScore >= 90) {
            strokeColor = 'var(--score-good)';
        } else if (safeScore >= 70) {
            strokeColor = 'var(--score-warn)';
        }

        scoreCircle.style.stroke = strokeColor;
        scoreValue.style.color = strokeColor;
    }

    function renderViolationsList(violations) {
        violationsList.innerHTML = '';

        if (!violations || violations.length === 0) {
            violationsList.innerHTML = `
                <div class="no-issues">
                    🎉 Excellent! No accessibility violations were detected within our active rule engine scope.
                </div>
            `;
            return;
        }

        violations.forEach(v => {
            const card = document.createElement('div');
            card.className = `violation-card sev-${v.severity}`;

            // Format HTML safely to prevent raw DOM injection execution
            const safeElement = v.element.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const formattedRule = v.rule.replace(/_/g, ' ').toUpperCase();

            card.innerHTML = `
                <div class="violation-header">
                    <div class="v-rule">${formattedRule}</div>
                    <div class="v-badge">${v.severity}</div>
                </div>
                <div class="v-message">${v.message}</div>
                <div class="v-element-wrapper">
                    <pre class="v-element">${safeElement}</pre>
                </div>
            `;

            violationsList.appendChild(card);
        });
    }

    async function fetchAndRenderHistory() {
        try {
            const response = await fetch('https://accessguard-backend.onrender.com/api/history');
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Unable to load history');
            }

            const historyItems = result.data || [];
            if (!historyItems.length) {
                historySection.classList.remove('hidden');
                historyList.innerHTML = '<p>No audit history found yet. Run your first audit to populate history.</p>';
                return;
            }

            historySection.classList.remove('hidden');
            historyList.innerHTML = `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>URL</th><th>Title</th><th>Score</th><th>Issues</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th><th>Date</th><th>Report</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyItems.map(item => `
                            <tr>
                                <td>${item.id}</td>
                                <td><a href="${item.url}" target="_blank" rel="noreferrer" style="color:#3b82f6;">${item.url}</a></td>
                                <td>${item.title}</td>
                                <td>${item.score}</td>
                                <td>${item.total_issues}</td>
                                <td>${item.critical_count}</td>
                                <td>${item.high_count}</td>
                                <td>${item.medium_count}</td>
                                <td>${item.low_count}</td>
                                <td>${new Date(item.timestamp).toLocaleString()}</td>
                                <td><a href="https://accessguard-backend.onrender.com/api/report/${item.id}" target="_blank">Download</a></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            showError(`History Load Failed: ${err.message}`);
        }
    }

    // Load history automatically when the app is ready
    fetchAndRenderHistory();
});
