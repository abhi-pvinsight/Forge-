import sys
import os
sys.path.insert(0, '.')
from sqlalchemy import create_engine, inspect
from app.database import DATABASE_URL

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

print("COLUMNS IN PROFILES TABLE:")
for col in inspector.get_columns("profiles"):
    print(f"  Name: {col['name']}, Type: {col['type']}")
