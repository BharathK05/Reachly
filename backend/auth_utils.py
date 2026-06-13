import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException

SECRET_KEY = os.environ.get("JWT_SECRET", "reachly-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(tenant_id: str, company_name: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": tenant_id,
        "company_name": company_name,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode JWT and return payload. Raises 401 on failure."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token.")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def get_tenant_from_cookie(request) -> dict:
    """
    Extract the JWT from the reachly_token cookie and return the tenant payload.
    Returns {"tenant_id": ..., "company_name": ..., "email": ...}
    Raises 401 if missing or invalid.
    """
    token = request.cookies.get("reachly_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_token(token)
    return {
        "tenant_id": payload["sub"],
        "company_name": payload.get("company_name", ""),
        "email": payload.get("email", ""),
    }
