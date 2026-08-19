import os
import sys

sys.path.insert(0, '.')
from sqlalchemy import create_engine
from app.database import Base, engine, SessionLocal, Profile, Organization, Client, Project, Report
from reset_db import reset_db

print("1. Recreating and seeding local PostgreSQL database...")
reset_db()

print("2. Verifying database records...")
db = SessionLocal()
try:
    org_count = db.query(Organization).count()
    profile_count = db.query(Profile).count()
    client_count = db.query(Client).count()
    project_count = db.query(Project).count()
    
    print(f"Verification Results:")
    print(f"  Organizations: {org_count}")
    print(f"  Profiles:      {profile_count}")
    print(f"  Clients:       {client_count}")
    print(f"  Projects:      {project_count}")
    
    # Query default project
    default_proj = db.query(Project).filter_by(name="Default Project").first()
    if default_proj:
        print(f"  Default Project ID: {default_proj.id}")
        
    print("Database verification: SUCCESS")
except Exception as e:
    print(f"Database verification: FAILED - {e}")
finally:
    db.close()

print("3. Testing FastAPI import...")
from main import app
print("FastAPI app loaded successfully.")
