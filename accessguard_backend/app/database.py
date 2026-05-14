import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accessguard.db")

def init_db():
    """
    Initializes the SQLite database and creates the audits table if it doesn't exist.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            score INTEGER NOT NULL,
            total_issues INTEGER NOT NULL,
            critical_count INTEGER NOT NULL,
            high_count INTEGER NOT NULL,
            medium_count INTEGER NOT NULL,
            low_count INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            violations TEXT DEFAULT '[]'
        )
    ''')
    
    # Attempt to gracefully add the violations column if upgrading an older existing DB
    try:
        cursor.execute('ALTER TABLE audits ADD COLUMN violations TEXT DEFAULT "[]"')
    except sqlite3.OperationalError:
        pass # Column likely already exists
        
    conn.commit()
    conn.close()

def save_audit(audit_data: Dict[str, Any]):
    """
    Saves a completed audit result into the SQLite database.
    """
    metadata = audit_data["metadata"]
    summary = audit_data["audit_summary"]
    breakdown = summary["severity_breakdown"]
    violations_json = json.dumps(audit_data.get("violations", []))
    
    # Generate ISO timestamp dynamically at runtime
    timestamp = datetime.utcnow().isoformat() + "Z"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO audits (
            url, title, score, total_issues, 
            critical_count, high_count, medium_count, low_count, timestamp, violations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        audit_data["url"],
        metadata["title"],
        summary["score"],
        summary["total_issues"],
        breakdown.get("Critical", 0),
        breakdown.get("High", 0),
        breakdown.get("Medium", 0),
        breakdown.get("Low", 0),
        timestamp,
        violations_json
    ))
    
    audit_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return audit_id

def get_all_audits() -> List[Dict[str, Any]]:
    """
    Retrieves the entire audit history from the database.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # To return dictionary-like rows
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM audits ORDER BY id DESC')
    rows = cursor.fetchall()
    
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            "id": row["id"],
            "url": row["url"],
            "title": row["title"],
            "score": row["score"],
            "total_issues": row["total_issues"],
            "critical_count": row["critical_count"],
            "high_count": row["high_count"],
            "medium_count": row["medium_count"],
            "low_count": row["low_count"],
            "timestamp": row["timestamp"]
        })
        
    return history

def get_audit_by_id(audit_id: int) -> Dict[str, Any]:
    """
    Retrieves a single audit record by its ID, including the fully parsed violations JSON array.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM audits WHERE id = ?', (audit_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    audit_record = dict(row)
    # Parse the violations array back into a python list
    audit_record['violations'] = json.loads(audit_record.get('violations', '[]'))
    
    return audit_record
