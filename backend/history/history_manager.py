import sqlite3


DB_NAME = "history.db"


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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.commit()
    conn.close()
def save_query(
    query,
    prediction,
    risk_level
):

    conn = sqlite3.connect(DB_NAME)

    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO query_history
        (
            query,
            prediction,
            risk_level
        )
        VALUES (?, ?, ?)
        """,
        (
            query,
            prediction,
            risk_level
        )
    )

    conn.commit()
    conn.close()
def get_history():

    conn = sqlite3.connect(DB_NAME)

    cur = conn.cursor()

    cur.execute(
        """
        SELECT *
        FROM query_history
        ORDER BY created_at DESC
        """
    )

    rows = cur.fetchall()

    conn.close()

    return rows
if __name__ == "__main__":

    initialize_database()

    print(
        "History DB Ready"
    )