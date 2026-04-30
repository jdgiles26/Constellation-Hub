"""
This module handles authentication, authorization, and security-related
functions for the Constellation Hub backend services.
"""
import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import (APIKeyHeader, HTTPAuthorizationCredentials,
                              HTTPBearer)
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from .config import get_settings
from .models.user import UserORM

# --- Configuration ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
logger = logging.getLogger(__name__)

# --- Enums and Schemas ---
class Role(str, Enum):
    """Enumeration for user roles."""
    VIEWER = "viewer"
    OPERATOR = "operator"
    ADMIN = "admin"

class TokenData(object):
    """
    Decoded token data. Not a Pydantic model to avoid accidental leakage.
    """
    def __init__(self, user_id: int, email: str, role: Role, exp: datetime):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.exp = exp

# --- Core Authentication Functions ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a hash for a plain-text password."""
    return pwd_context.hash(password)

# Alias for backward compatibility
hash_password = get_password_hash

async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[UserORM]:
    """
    Find a user by email and verify their password.

    Args:
        db: The SQLAlchemy async session.
        email: The user's email.
        password: The user's plain-text password.

    Returns:
        The User ORM object if authentication is successful, otherwise None.
    """
    result = await db.execute(select(UserORM).filter(UserORM.email == email))
    user = result.scalars().first()

    if not user:
        logger.debug(f"Authentication failed: User with email '{email}' not found.")
        return None
    if not verify_password(password, user.hashed_password):
        logger.debug(f"Authentication failed: Invalid password for user '{email}'.")
        return None

    return user

def create_access_token(user_id: int, email: str, role: Role, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "role": role.value,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def create_refresh_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT refresh token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, settings.jwt_refresh_secret_key, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> TokenData:
    """Decode and validate a JWT access token."""
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub"))
        email = payload.get("email")
        role_str = payload.get("role")
        exp = payload.get("exp")

        if not all([user_id is not None, email, role_str, exp]):
            raise credentials_exception

        role = Role(role_str)
        return TokenData(user_id=user_id, email=email, role=role, exp=datetime.fromtimestamp(exp, tz=timezone.utc))

    except (JWTError, ValueError, TypeError) as e:
        logger.error(f"Token decode error: {e}")
        raise credentials_exception from e

# --- Dependency Functions for Routes ---

async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    api_key: Annotated[Optional[str], Depends(api_key_header)],
    request: Request
) -> TokenData:
    """
    Extract and validate the current user from request.

    Supports both Bearer token and API key authentication.
    Returns TokenData if valid, raises HTTPException otherwise.
    """
    settings = get_settings()

    # Check if auth is disabled (dev mode)
    if settings.auth_disabled:
        return TokenData(
            user_id=0,
            email="dev@localhost",
            role=Role.ADMIN,
            exp=datetime.now(timezone.utc) + timedelta(days=365)
        )

    # Try Bearer token first
    if credentials and credentials.credentials:
        return decode_token(credentials.credentials)

    # Try API key
    if api_key:
        # NOTE: This is a placeholder. A real implementation would validate
        # the API key against a database of users or services.
        if api_key == settings.api_key_placeholder:
             return TokenData(
                user_id=-1,
                email="api-service",
                role=Role.ADMIN,
                exp=datetime.now(timezone.utc) + timedelta(days=365)
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

def require_role(required_role: Role):
    """Dependency factory to require a minimum role level."""
    role_hierarchy = {Role.VIEWER: 1, Role.OPERATOR: 2, Role.ADMIN: 3}

    async def role_checker(token_data: Annotated[TokenData, Depends(get_current_user)]) -> TokenData:
        user_level = role_hierarchy.get(token_data.role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient privileges. {required_role.value.capitalize()} role required."
            )
        return token_data
    return role_checker

# Pre-configured dependencies for common roles
require_auth = Depends(get_current_user)
require_viewer = Depends(require_role(Role.VIEWER))
require_operator = Depends(require_role(Role.OPERATOR))
require_admin = Depends(require_role(Role.ADMIN))

# Backward compatibility alias
get_current_active_user = get_current_user
