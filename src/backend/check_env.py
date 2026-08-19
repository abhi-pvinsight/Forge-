import sys
import os
sys.path.insert(0, '.')
from app.database import DATABASE_URL, engine

print("DATABASE_URL:", DATABASE_URL)
try:
    with engine.connect() as conn:
        print("Local database connection status: SUCCESS")
except Exception as e:
    print("Local database connection status: FAILED -", str(e))
    
print("ALLOW_DEV_BYPASS_AUTH:", os.getenv("ALLOW_DEV_BYPASS_AUTH"))
print("TEST_USER_ID:", os.getenv("TEST_USER_ID", "NOT SET"))
