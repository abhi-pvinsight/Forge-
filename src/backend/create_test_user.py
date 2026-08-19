import secrets
import sys
import os
import uuid as _uuid

sys.path.insert(0, '.')
from app.database import SessionLocal, Profile
from app.auth import get_password_hash, get_default_organization_id

TEST_USER_EMAIL = "forge-test-user@pvinsight.local"

def create_test_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.query(Profile).filter(Profile.email == TEST_USER_EMAIL).first()
        if existing:
            print(f"User {TEST_USER_EMAIL} already exists (ID: {existing.id})")
            user_id = existing.id
            password = "(existing password)"
        else:
            password = secrets.token_urlsafe(24)
            org_id = get_default_organization_id(db)
            user_uuid = _uuid.uuid4()
            
            new_profile = Profile(
                id=user_uuid,
                email=TEST_USER_EMAIL,
                hashed_password=get_password_hash(password),
                organization_id=org_id,
                role="member",
                full_name="Developer Bypass",
                department=None,
                vertical=None,
            )
            db.add(new_profile)
            db.commit()
            db.refresh(new_profile)
            user_id = new_profile.id
            print(f"Created auth user: {TEST_USER_EMAIL}")
            print(f"  id:       {user_id}")
            print(f"  password: {password}")
            
        print()
        print("Add this to .env and .env.production:")
        print(f"  TEST_USER_ID={user_id}")
        print(f"  VITE_TEST_USER_ID={user_id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating test user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
