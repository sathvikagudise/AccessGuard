import hashlib, os
from dotenv import load_dotenv
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Header

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", ".env"))
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, EmailStr
from app.config import GOOGLE_CLIENT_ID
from app.scraper import scrape_website
from app.engine import analyze_accessibility
from app.scoring import calculate_score
from app.database import init_db, save_audit, get_user_audits, get_audit_by_id, \
    get_user_by_email, get_user_by_google_id, create_user, get_all_audits_for_trends
from app.auth import hash_password, verify_password, create_access_token, verify_access_token, verify_google_token

app = FastAPI(title="AccessGuard - Real-Time Web Accessibility Audit Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


# -------------------- Auth Models --------------------

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    google_token: str


class AuthResponse(BaseModel):
    token: str
    user: dict


# -------------------- Audit Models --------------------

class AuditRequest(BaseModel):
    url: HttpUrl


class BatchAuditRequest(BaseModel):
    urls: List[HttpUrl]


# -------------------- Auth Dependency --------------------

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


# -------------------- Auth Endpoints --------------------

@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = hash_password(request.password)
    user = create_user(name=request.name, email=request.email, hashed_password=hashed_pw)
    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"],
                                      "avatar_url": user.get("avatar_url", "")}}


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    user = get_user_by_email(request.email)
    if not user or not user["hashed_password"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"],
                                      "avatar_url": user.get("avatar_url", "")}}


@app.post("/api/auth/google")
async def google_auth(request: GoogleAuthRequest):
    idinfo = await verify_google_token(request.google_token)
    if not idinfo:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    google_id = idinfo["sub"]
    email = idinfo["email"]
    name = idinfo.get("name", email.split("@")[0])
    avatar_url = idinfo.get("picture", "")

    user = get_user_by_google_id(google_id)
    if not user:
        existing = get_user_by_email(email)
        if existing:
            if not existing["google_id"]:
                from app.database import get_session, User
                session = get_session()
                try:
                    db_user = session.query(User).filter(User.id == existing["id"]).first()
                    db_user.google_id = google_id
                    db_user.avatar_url = avatar_url
                    session.commit()
                finally:
                    session.close()
            user = get_user_by_google_id(google_id)
        else:
            user = create_user(name=name, email=email, google_id=google_id, avatar_url=avatar_url)

    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"],
                                      "avatar_url": user.get("avatar_url", "")}}


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


# -------------------- Health --------------------

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AccessGuard Backend"}


# -------------------- Audit Endpoints (Protected) --------------------

@app.post("/api/audit")
async def perform_audit(request: AuditRequest, current_user: dict = Depends(get_current_user)):
    try:
        url_str = str(request.url)
        scrape_result = await scrape_website(url_str)
        soup = scrape_result.pop("soup")
        metadata = scrape_result["metadata"]

        violations = analyze_accessibility(soup)

        from app.remediation import generate_remediation
        enriched_violations = []
        for v in violations:
            enriched_violations.append(generate_remediation(v, soup))
        violations = enriched_violations

        from app.adaptive_engine import analyze_trends, adjust_weights, generate_priority_insights
        all_audits = get_all_audits_for_trends()
        trends, total_past_audits = analyze_trends(all_audits)
        dynamic_weights = adjust_weights(trends, total_past_audits)
        adaptive_insights = generate_priority_insights(trends, total_past_audits)
        adaptive_insights["trend_data"] = trends

        audit_summary = calculate_score(violations, dynamic_weights)

        user_id = int(current_user["sub"])

        audit_response = {
            "metadata": metadata,
            "violations": violations,
            "audit_summary": audit_summary,
            "adaptive_insights": adaptive_insights,
        }

        audit_id = save_audit({
            "url": url_str,
            "metadata": metadata,
            "audit_summary": audit_summary,
            "violations": violations,
        }, user_id)

        audit_response["id"] = audit_id

        return {"status": "success", "data": audit_response}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/batch-audit")
async def perform_batch_audit(request: BatchAuditRequest, current_user: dict = Depends(get_current_user)):
    try:
        results = []
        for url_obj in request.urls:
            url_str = str(url_obj)
            try:
                scrape_result = await scrape_website(url_str)
                soup = scrape_result.pop("soup")
                violations = analyze_accessibility(soup)

                from app.remediation import generate_remediation
                enriched_violations = []
                for v in violations:
                    enriched_violations.append(generate_remediation(v, soup))
                violations = enriched_violations

                audit_summary = calculate_score(violations, site_identifier=url_str)

                results.append({
                    "url": url_str,
                    "score": audit_summary["score"],
                    "total_issues": audit_summary["total_issues"],
                    "severity_breakdown": audit_summary["severity_breakdown"],
                })
            except Exception as e:
                results.append({
                    "url": url_str,
                    "score": 0,
                    "total_issues": 0,
                    "severity_breakdown": {},
                    "error": str(e),
                    "error_message": "Failed to scrape or process URL",
                })

        for item in results:
            base_score = float(item.get("score", 0))
            url_hash = int(hashlib.md5(item["url"].encode("utf-8")).hexdigest(), 16)
            tie_delta = (url_hash % 100) / 1000.0
            adjusted_score = round(base_score + tie_delta, 3)
            item["score"] = adjusted_score

        sorted_results = sorted(results, key=lambda x: x["score"], reverse=True)
        ranking = []
        for index, res in enumerate(sorted_results):
            ranking.append({"url": res["url"], "score": res["score"], "rank": index + 1})

        if sorted_results:
            best_site = sorted_results[0]["url"]
            worst_site = sorted_results[-1]["url"]
            valid_scores = [r["score"] for r in sorted_results if "error" not in r]
            avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0
        else:
            best_site = "N/A"
            worst_site = "N/A"
            avg_score = 0

        comparative_insights = {
            "best_site": best_site,
            "worst_site": worst_site,
            "average_score": round(avg_score, 2),
        }

        return {
            "status": "success",
            "data": {
                "results": results,
                "ranking": ranking,
                "comparative_insights": comparative_insights,
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    try:
        user_id = int(current_user["sub"])
        history = get_user_audits(user_id)
        return {"status": "success", "data": history}
    except Exception as e:
        return {"status": "error", "message": str(e)}


from fastapi import Response

@app.get("/api/report/{audit_id}")
async def download_report(audit_id: int, current_user: dict = Depends(get_current_user)):
    try:
        user_id = int(current_user["sub"])
        from app.pdf_report import generate_pdf_report
        audit_record = get_audit_by_id(audit_id, user_id)
        if not audit_record:
            raise HTTPException(status_code=404, detail="Audit not found")
        pdf_bytes = generate_pdf_report(audit_record)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="audit_report_{audit_id}.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}
