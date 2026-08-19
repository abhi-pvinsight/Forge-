import psycopg2
try:
    conn = psycopg2.connect("host=localhost port=5432 dbname=forge user=postgres password=password")
    print("PG CONNECTION SUCCESS!")
    conn.close()
except Exception as e:
    print("PG CONNECTION FAILED:", e)
