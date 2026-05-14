import sys
import os
import json
import sqlite3
from datetime import datetime
sys.path.append(r'c:\Users\sathv\Downloads\Creations\Audit Scraper\accessguard_backend')

from app.adaptive_engine import analyze_trends, adjust_weights, generate_priority_insights
from app.database import DB_PATH

with open("py_adaptive_out.txt", "w") as f:
    f.write("--- BEFORE SEEDING MOCK DATA ---\n")
    trends, total = analyze_trends()
    w1 = adjust_weights(trends, total)
    ins1 = generate_priority_insights(trends, total)
    f.write(f"Total Audits: {total}\n")
    f.write(f"Trends: {trends}\n")
    f.write(f"Dynamic Weights: {w1}\n")
    f.write(f"Insights: {ins1}\n\n")

    # Inject multiple mock audits where `missing_image_alt` is extreme
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    mock_violations = json.dumps([{"rule": "missing_image_alt"}, {"rule": "input_without_label"}])
    for _ in range(5):
        cursor.execute('''
            INSERT INTO audits (url, title, score, total_issues, critical_count, high_count, medium_count, low_count, timestamp, violations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ("http://test.com", "Test", 50, 2, 1, 1, 0, 0, datetime.utcnow().isoformat() + "Z", mock_violations))
    
    conn.commit()
    conn.close()

    f.write("--- AFTER SEEDING MOCK DATA (High failure rate on image/labels) ---\n")
    trends2, total2 = analyze_trends()
    w2 = adjust_weights(trends2, total2)
    ins2 = generate_priority_insights(trends2, total2)
    
    f.write(f"Total Audits: {total2}\n")
    f.write(f"Trends: {trends2}\n")
    f.write(f"Dynamic Weights: {w2}\n")
    f.write(f"Insights: {ins2}\n")
