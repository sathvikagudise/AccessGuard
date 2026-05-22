import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audits = relationship("Audit", back_populates="user", cascade="all, delete-orphan")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String(2048), nullable=False)
    title = Column(String(255), nullable=False)
    score = Column(Integer, nullable=False)
    total_issues = Column(Integer, nullable=False)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    medium_count = Column(Integer, nullable=False, default=0)
    low_count = Column(Integer, nullable=False, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
    violations = Column(Text, default="[]")

    user = relationship("User", back_populates="audits")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session():
    return SessionLocal()


def save_audit(audit_data: Dict[str, Any], user_id: int) -> int:
    metadata = audit_data["metadata"]
    summary = audit_data["audit_summary"]
    breakdown = summary["severity_breakdown"]
    violations_json = json.dumps(audit_data.get("violations", []))

    session = get_session()
    try:
        audit = Audit(
            user_id=user_id,
            url=audit_data["url"],
            title=metadata["title"],
            score=summary["score"],
            total_issues=summary["total_issues"],
            critical_count=breakdown.get("Critical", 0),
            high_count=breakdown.get("High", 0),
            medium_count=breakdown.get("Medium", 0),
            low_count=breakdown.get("Low", 0),
            violations=violations_json,
        )
        session.add(audit)
        session.commit()
        session.refresh(audit)
        return audit.id
    finally:
        session.close()


def get_user_audits(user_id: int) -> List[Dict[str, Any]]:
    session = get_session()
    try:
        rows = session.query(Audit).filter(Audit.user_id == user_id).order_by(Audit.id.desc()).all()
        return [
            {
                "id": row.id,
                "url": row.url,
                "title": row.title,
                "score": row.score,
                "total_issues": row.total_issues,
                "critical_count": row.critical_count,
                "high_count": row.high_count,
                "medium_count": row.medium_count,
                "low_count": row.low_count,
                "timestamp": row.timestamp.isoformat() if row.timestamp else "",
            }
            for row in rows
        ]
    finally:
        session.close()


def get_audit_by_id(audit_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    session = get_session()
    try:
        query = session.query(Audit).filter(Audit.id == audit_id)
        if user_id is not None:
            query = query.filter(Audit.user_id == user_id)
        row = query.first()
        if not row:
            return None
        record = {
            "id": row.id,
            "user_id": row.user_id,
            "url": row.url,
            "title": row.title,
            "score": row.score,
            "total_issues": row.total_issues,
            "critical_count": row.critical_count,
            "high_count": row.high_count,
            "medium_count": row.medium_count,
            "low_count": row.low_count,
            "timestamp": row.timestamp.isoformat() if row.timestamp else "",
            "violations": json.loads(row.violations or "[]"),
        }
        return record
    finally:
        session.close()


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    session = get_session()
    try:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            return None
        return {"id": user.id, "name": user.name, "email": user.email, "hashed_password": user.hashed_password,
                "google_id": user.google_id, "avatar_url": user.avatar_url, "created_at": user.created_at}
    finally:
        session.close()


def get_user_by_google_id(google_id: str) -> Optional[Dict[str, Any]]:
    session = get_session()
    try:
        user = session.query(User).filter(User.google_id == google_id).first()
        if not user:
            return None
        return {"id": user.id, "name": user.name, "email": user.email, "hashed_password": user.hashed_password,
                "google_id": user.google_id, "avatar_url": user.avatar_url, "created_at": user.created_at}
    finally:
        session.close()


def create_user(name: str, email: str, hashed_password: Optional[str] = None,
                google_id: Optional[str] = None, avatar_url: Optional[str] = None) -> Dict[str, Any]:
    session = get_session()
    try:
        user = User(name=name, email=email, hashed_password=hashed_password,
                    google_id=google_id, avatar_url=avatar_url)
        session.add(user)
        session.commit()
        session.refresh(user)
        return {"id": user.id, "name": user.name, "email": user.email,
                "google_id": user.google_id, "avatar_url": user.avatar_url, "created_at": user.created_at}
    finally:
        session.close()


def get_all_audits_for_trends() -> List[Dict[str, Any]]:
    session = get_session()
    try:
        rows = session.query(Audit).all()
        return [{"violations": row.violations or "[]"} for row in rows]
    finally:
        session.close()
