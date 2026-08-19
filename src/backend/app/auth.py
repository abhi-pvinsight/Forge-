import os
import uuid as _uuid
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
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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

def get_default_organization_id(db: Session) -> _uuid.UUID:
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
            test_user_str = os.getenv("TEST_USER_ID", "test-user-id")
            try:
                test_user_id = _uuid.UUID(test_user_str)
            except ValueError:
                test_user_id = _uuid.uuid5(_uuid.NAMESPACE_DNS, test_user_str)
                
            profile = db.query(Profile).filter(Profile.id == test_user_id).first()
            if profile:
                return {
                    "id": str(profile.id),
                    "email": profile.email,
                    "organization_id": str(profile.organization_id) if profile.organization_id else None,
                    "role": profile.role,
                    "full_name": profile.full_name,
                    "department": profile.department,
                    "vertical": profile.vertical,
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
                department=None,
                vertical=None,
            )
            db.add(profile)
            db.commit()
            return {
                "id": str(profile.id),
                "email": profile.email,
                "organization_id": str(profile.organization_id) if profile.organization_id else None,
                "role": profile.role,
                "full_name": profile.full_name,
                "department": profile.department,
                "vertical": profile.vertical,
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
        try:
            user_uuid = _uuid.UUID(user_id)
        except ValueError:
            user_uuid = _uuid.uuid5(_uuid.NAMESPACE_DNS, user_id)
            
        user = db.query(Profile).filter(Profile.id == user_uuid).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        return {
            "id": str(user.id),
            "email": user.email,
            "organization_id": str(user.organization_id) if user.organization_id else None,
            "role": user.role,
            "full_name": user.full_name,
            "department": user.department,
            "vertical": user.vertical,
        }
    finally:
        db.close()
