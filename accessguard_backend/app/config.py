import os
from urllib.parse import quote_plus

# Database: Set DATABASE_URL env var to override (e.g., SQLite on Render)
# Default: MySQL from individual env vars (local XAMPP)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "accessguard")
    DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

# JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Scoring weights for different accessibility violation severities
SCORING_WEIGHTS = {
    "Critical": 15,
    "High": 10,
    "Medium": 5,
    "Low": 2
}
