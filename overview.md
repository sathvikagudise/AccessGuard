# AccessGuard Project Overview

## 1. Project Purpose
AccessGuard is a local, end-to-end web accessibility audit platform. It:
- Scrapes live website HTML in real time
- Applies deterministic accessibility rules (WCAG-style checks)
- Generates remediation suggestions and corrected HTML outputs
- Computes severity-weighted score (0-100)
- Stores audit history in SQLite
- Supports single + batch execution
- Exports professional PDF report per audit
- Frontend dashboard shows metrics, attacks, and history

## 2. Technology Stack
- Backend:
  - Python 3.14+ (venv)
  - FastAPI
  - Uvicorn ASGI server
  - httpx (async HTTP requests)
  - BeautifulSoup4 (DOM parsing)
  - reportlab (PDF generation)
  - sqlite3 (local file DB)
- Frontend:
  - Vanilla HTML/CSS/JavaScript
  - No framework
- Dev tooling and docs:
  - README.md
  - overview.md (this file)

## 3. Project Structure
- `accessguard_backend/app`: backend code
  - `main.py`: routes and orchestration
  - `scraper.py`: HTTP scraper, metadata, soup
  - `engine.py`: accessibility rule engine
  - `remediation.py`: ai_suggestion + corrected_html
  - `scoring.py`: score and breakdown
  - `database.py`: sqlite schema and queries
  - `pdf_report.py`: PDF builder
  - `adaptive_engine.py`: trends and weight adjustments
- `accessguard_backend/requirements.txt`: dependencies
- `frontend/index.html`: dashboard UI
- `frontend/app.js`: API client + UI logic
- `frontend/styles.css`: styling
- `overview.md`: project summary

## 4. API Endpoints
- `POST /api/audit`
  - Input: `{ "url": "https://..." }`
  - Workflow:
    1. scrape_website(url)
    2. analyze_accessibility(soup)
    3. generate_remediation(violations)
    4. apply adaptive intelligence weights
    5. calculate_score and build audit_summary
    6. save_audit to SQLite (store score/detail/timestamp)
    7. return status+data with db id
- `POST /api/batch-audit`
  - Input: `{ "urls": ["https://..", ...] }`
  - Per-url scrape+analysis with aggregated ranking and comparative insights
- `GET /api/history`
  - Returns recent audit rows: id, url, title, score, issues counts, timestamp
- `GET /api/report/{audit_id}`
  - Creates PDF from saved record and returns as HTTP file download

## 5. Core Features Implemented
1. Single-url accessibility audit
2. Batch-site audit with leaderboard + insights
3. Dynamic score dial (0-100)
4. Violation grid by severity (Critical/High/Medium/Low)
5. Audit history table from sqlite
6. Report download per audit (PDF via reportlab)
7. CORS-enabled backend for local frontend
8. Status loader, error UI
9. HTML escaping in UI for safe display
10. UI refresh history button

## 6. Data Model
### SQLite `audits` table
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `url` TEXT
- `title` TEXT
- `score` INTEGER
- `total_issues` INTEGER
- `critical_count` INTEGER
- `high_count` INTEGER
- `medium_count` INTEGER
- `low_count` INTEGER
- `timestamp` TEXT (ISO)
- `violations` TEXT (JSON array)

## 7. How to run
1. Activate venv
   - `cd accessguard_backend`
   - `.venv\Scripts\Activate.ps1`
2. Install deps (already done):
   - `.venv\Scripts\pip install -r requirements.txt`
3. Run server:
   - `.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
4. Open `frontend/index.html` in browser
5. Run audit and use UI

## 8. Sanity checks done
- `POST /api/audit` with `https://example.com` -> success + score 100 + id
- `GET /api/history` -> returns past audits
- `GET /api/report/{id}` -> returns PDF (download)
- Frontend now includes history refresh and renders table

## 9. Notes on improvements
- Add pagination + sorting for history.
- Add UX for storing frontend last-viewed audit.
- Add direct in-page PDF preview.
- Add diff mode to compare two audits.
- Add routing/UI feedback for `api/audit` request failures.
