# backend/database/test_connection.py

from db_connection import get_connection

try:
    conn = get_connection()
    print("Connected Successfully!")
    conn.close()

except Exception as e:
    print(e)