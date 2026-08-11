import os
from sqlalchemy import create_engine
from app.database import Base
from alembic import command
from alembic.config import Config

os.environ["DATABASE_URL"] = "postgresql://postgres:root@localhost:5433/forge"
os.environ["LLMWHISPERER_API_KEY"] = "dummy"

print("1. Testing engine creation...")
engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as conn:
    print("Database connected.")

print("2. Testing Alembic upgrade head...")
alembic_cfg = Config("alembic.ini")
command.upgrade(alembic_cfg, "head")
print("Migrations applied successfully.")

print("3. Testing FastAPI import...")
from main import app
print("FastAPI app loaded successfully.")
