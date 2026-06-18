import sqlite3
import os

DB_NAME = os.path.join(os.path.dirname(__file__), "history.db")

def initialize_database():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS query_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT,
            prediction REAL,
            risk_level TEXT,
            primary_model TEXT,
            rules_count INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()

def save_query(query, prediction, risk_level, primary_model="RF", rules_count=0):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO query_history (query, prediction, risk_level, primary_model, rules_count)
        VALUES (?, ?, ?, ?, ?)
        """,
        (query, prediction, risk_level, primary_model, rules_count)
    )
    # Clear history after 500 entries (Feature 15)
    cur.execute(
        """
        DELETE FROM query_history
        WHERE id NOT IN (
            SELECT id
            FROM query_history
            ORDER BY created_at DESC
            LIMIT 500
        )
        """
    )
    conn.commit()
    conn.close()

def get_history(risk_filter="All"):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    if risk_filter == "All" or not risk_filter:
        cur.execute(
            """
            SELECT id, query, prediction, risk_level, primary_model, rules_count, created_at
            FROM query_history
            ORDER BY created_at DESC
            """
        )
    else:
        cur.execute(
            """
            SELECT id, query, prediction, risk_level, primary_model, rules_count, created_at
            FROM query_history
            WHERE LOWER(risk_level) = ?
            ORDER BY created_at DESC
            """,
            (risk_filter.lower(),)
        )
    rows = cur.fetchall()
    conn.close()
    return rows

def clear_all_history():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("DELETE FROM query_history")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    initialize_database()
    print("History DB Ready with full columns")