from backend.database.db_connection import (
    get_connection
)

from backend.feature_extraction.feature_vector import (
    build_feature_vector
)

from backend.optimization.advisor import (
    get_recommendations
)

conn = get_connection()

query = """
SELECT *
FROM customers
"""

features = build_feature_vector(
    query,
    conn
)

recommendations = get_recommendations(
    query,
    features
)

for item in recommendations:
    print(item)

conn.close()