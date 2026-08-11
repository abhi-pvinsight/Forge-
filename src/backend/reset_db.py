import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(user="postgres", password="root", host="localhost", port="5432", database="postgres")
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

try:
    # Need to terminate other connections to drop the DB
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'forge' AND pid <> pg_backend_pid();")
    cur.execute("DROP DATABASE IF EXISTS forge")
    print("Database forge dropped.")
except Exception as e:
    print(f"Error dropping database: {e}")

try:
    cur.execute("CREATE DATABASE forge")
    print("Database forge created.")
except Exception as e:
    print(f"Error creating database: {e}")

cur.close()
conn.close()
