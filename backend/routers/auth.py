from fastapi import APIRouter, HTTPException, Request, Response
from db.client import get_supabase
from auth_utils import hash_password, verify_password, create_access_token, get_tenant_from_cookie
from models.schemas import TenantRegister, TenantLogin

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "reachly_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def _set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
        secure=False,  # set True in production with HTTPS
    )


@router.post("/register")
async def register(body: TenantRegister, response: Response):
    """Create a new tenant account. Returns JWT in cookie."""
    supabase = get_supabase()

    # Check for duplicate email
    existing = supabase.table("tenants").select("id").eq("email", body.email.lower().strip()).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Hash password and insert
    pw_hash = hash_password(body.password)
    try:
        result = supabase.table("tenants").insert({
            "company_name": body.company_name.strip(),
            "email": body.email.lower().strip(),
            "password_hash": pw_hash,
        }).execute()
        tenant = result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create account: {e}")

    token = create_access_token(tenant["id"], tenant["company_name"], tenant["email"])
    _set_auth_cookie(response, token)

    return {
        "success": True,
        "company_name": tenant["company_name"],
        "email": tenant["email"],
    }


@router.post("/login")
async def login(body: TenantLogin, response: Response):
    """Verify credentials, return JWT in cookie."""
    supabase = get_supabase()

    result = supabase.table("tenants").select("id, company_name, email, password_hash").eq(
        "email", body.email.lower().strip()
    ).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    tenant = result.data[0]
    if not verify_password(body.password, tenant["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(tenant["id"], tenant["company_name"], tenant["email"])
    _set_auth_cookie(response, token)

    return {
        "success": True,
        "company_name": tenant["company_name"],
        "email": tenant["email"],
    }


@router.get("/me")
async def me(request: Request):
    """Return current tenant info from JWT cookie."""
    tenant = get_tenant_from_cookie(request)
    return {
        "tenant_id": tenant["tenant_id"],
        "company_name": tenant["company_name"],
        "email": tenant["email"],
    }


@router.delete("/logout")
async def logout(response: Response):
    """Clear the auth cookie."""
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"success": True}
