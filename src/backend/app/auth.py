import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import Profile, Organization, SessionLocal

# Auth constants
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week
import bcrypt
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password[:72].encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency for DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_default_organization_id(db: Session) -> int:
    default_name = os.getenv("DEFAULT_ORGANIZATION_NAME", "PV-Insight")
    org = db.query(Organization).filter(Organization.name == default_name).first()
    if org:
        return org.id
    new_org = Organization(name=default_name)
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org.id

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    token = credentials.credentials
    
    # Optional Dev Bypass logic
    if token == "dev-bypass-token" and os.getenv("ALLOW_DEV_BYPASS_AUTH", "").lower() in {"1", "true", "yes"}:
        db = SessionLocal()
        try:
            test_user_id = os.getenv("TEST_USER_ID", "test-user-id")
            profile = db.query(Profile).filter(Profile.id == test_user_id).first()
            if profile:
                return {
                    "id": profile.id,
                    "email": profile.email,
                    "organization_id": profile.organization_id,
                    "role": profile.role,
                    "full_name": profile.full_name,
                    "department": profile.department,
                }
            # Create if bypass doesn't exist
            org_id = get_default_organization_id(db)
            profile = Profile(
                id=test_user_id,
                email="forge-test-user@pvinsight.local",
                hashed_password=get_password_hash("password"),
                organization_id=org_id,
                role="member",
                full_name="Developer Bypass",
                department=None
            )
            db.add(profile)
            db.commit()
            return {
                "id": profile.id,
                "email": profile.email,
                "organization_id": profile.organization_id,
                "role": profile.role,
                "full_name": profile.full_name,
                "department": profile.department,
            }
        finally:
            db.close()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        
    db = SessionLocal()
    try:
        user = db.query(Profile).filter(Profile.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        return {
            "id": user.id,
            "email": user.email,
            "organization_id": user.organization_id,
            "role": user.role,
            "full_name": user.full_name,
            "department": user.department,
        }
    finally:
        db.close()
