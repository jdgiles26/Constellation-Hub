'''
This module defines authentication-related routes for the FastAPI application.

It includes endpoints for:
- User login and token generation.
- Retrieving the current authenticated user's information.

Security is handled using OAuth2 with password flow, and JWTs for token-based
authentication.
'''
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import (authenticate_user, create_access_token,
                   get_current_active_user)
from .database import get_db
from .schemas import TokenResponse, User

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30


@router.post("/login", response_model=TokenResponse)
async def login(
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    '''
    Handles user login.

    Authenticates a user based on username and password, and if successful,
    returns a JWT access token.

    Args:
        db (AsyncSession): The database session, injected as a dependency.
        form_data (OAuth2PasswordRequestForm): The user's login credentials,
                                               injected from the request body.

    Returns:
        TokenResponse: An object containing the JWT access token and token type.

    Raises:
        HTTPException: If authentication fails (e.g., incorrect username or
                       password), an HTTP 401 Unauthorized error is raised.
    '''
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    '''
    Retrieves the current authenticated user's information.

    This route is protected and requires a valid JWT access token. The token
    is used to identify and return the user's data.

    Args:
        current_user (User): The authenticated user object, injected as a
                             dependency based on the provided JWT.

    Returns:
        User: The Pydantic model representing the current user.
    '''
    return current_user
