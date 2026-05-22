# AccessGuard

> A production-grade, self-correcting web accessibility intelligence platform that performs real-time audits on live websites.

---

## Overview

AccessGuard is a real-time deterministic web accessibility auditing and context-aware HTML remediation platform. It extracts live DOM data, evaluates raw DOM elements against strict accessibility standards (such as WCAG), and generates perfectly formatted AI-driven remediation suggestions without relying on external APIs.

---

## Features

- Real-Time DOM Analysis
- WCAG Accessibility Detection
- Context-Aware HTML Remediation
- Before/After HTML Transformation Previews
- Adaptive Accessibility Scoring
- Dynamic PDF Report Generation
- Persistent SQLite Storage

---

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (ES6)

### Backend
- Python
- FastAPI
- HTTPX (Async requests)
- BeautifulSoup4 (DOM Parsing)
- ReportLab (PDF Compiler)

### Database
- SQLite3

---

## Folder Structure

```bash
AccessGuard/
│
├── accessguard_backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── scraper.py
│   │   ├── engine.py
│   │   ├── remediation.py
│   │   ├── scoring.py
│   │   ├── database.py
│   │   └── pdf_report.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── styles.css
│   ├── app.js
│   ├── dashboard.js
│   └── firebase-config.js
│
├── .github/
│   └── workflows/
│       └── validate.yml
│
├── .env.example
├── render.yaml
├── vercel.json
├── README.md
└── .gitignore
```

---

## Installation Guide

### 1. Clone the Repository

```bash
git clone https://github.com/sathvikagudise/AccessGuard.git
```

### 2. Navigate to Project Directory

```bash
cd AccessGuard
```

### 3. Install Dependencies

```bash
cd accessguard_backend
pip install -r requirements.txt
```

### 4. Start Development Server

```bash
uvicorn app.main:app --port 8000
```
(To run the frontend locally, open a new terminal in the `frontend` folder and run `python -m http.server 3000`)

---

## Environment Variables

Create a `.env` file in the root directory and configure necessary environment variables. Also ensure you update `frontend/firebase-config.js` with your Firebase credentials.

```env
FIREBASE_API_KEY=your_api_key
```

---

## Deployment

### Build for Production

No explicit build command is required for the Vanilla JS frontend.

### Deploy Using

- Vercel (Frontend SPA)
- Render (FastAPI Backend Web Service)

---

## Testing

Run backend tests using:

```bash
pytest
```
(GitHub Actions CI/CD validation is also triggered on push).

---

## API Documentation

Example API endpoint:

```http
POST /api/audit
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": "audit_12345",
    "url": "https://example.com",
    "audit_summary": {
      "score": 85,
      "total_issues": 12
    }
  }
}
```

---

## Contributing

Contributions are welcome.

### Steps to Contribute

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Added new feature"
```

4. Push to GitHub

```bash
git push origin feature-name
```

5. Create a Pull Request

---

## Security

- Firebase Authentication (Google Sign-in)
- CORS Policies
- Stateless API Architecture

---

## License

This project is licensed under the MIT License.

---

## Author

Gudise Sathvika

- GitHub: https://github.com/sathvikagudise
- LinkedIn: https://linkedin.com/in/sathvikayadav
- Email: sathvikayadav3@gmail.com

---

## Support

If you like this project, give it a star on GitHub.
