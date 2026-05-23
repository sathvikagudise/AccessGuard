from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_DAYS, GOOGLE_CLIENT_ID

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def verify_google_token(google_token: str) -> Optional[dict]:
    if not GOOGLE_CLIENT_ID:
        print("DEBUG_GAUTH: GOOGLE_CLIENT_ID is not set", flush=True)
        return None
    try:
        import json, urllib.request, urllib.parse, ssl
        params = urllib.parse.urlencode({"id_token": google_token})
        url = f"https://oauth2.googleapis.com/tokeninfo?{params}"
        ctx = ssl.create_default_context()
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            if resp.status != 200:
                print(f"DEBUG_GAUTH: tokeninfo returned {resp.status}", flush=True)
                body = resp.read().decode()
                print(f"DEBUG_GAUTH: body={body[:500]}", flush=True)
                return None
            data = json.loads(resp.read().decode())
            if data.get("aud") != GOOGLE_CLIENT_ID:
                print(f"DEBUG_GAUTH: aud mismatch: {data.get('aud')} != {GOOGLE_CLIENT_ID}", flush=True)
                return None
            if data.get("sub") is None:
                print("DEBUG_GAUTH: sub is None", flush=True)
                return None
            return data
    except Exception as e:
        print(f"DEBUG_GAUTH: exception: {e}", flush=True)
        return None
