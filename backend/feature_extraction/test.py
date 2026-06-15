from backend.database.db_connection import (
    get_connection
)

from backend.feature_extraction.feature_vector import (
    build_feature_vector
)

conn = get_connection()

query = """
SELECT customer_id,
       COUNT(*)
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 5
ORDER BY customer_id;
"""

features = build_feature_vector(
    query,
    conn
)

for key, value in features.items():
    print(
        f"{key}: {value}"
    )

conn.close()