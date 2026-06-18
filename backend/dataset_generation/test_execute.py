from backend.dataset_generation.execute_queries import (
    execute_query
)

query = """
SELECT *
FROM customers
"""

print(
    execute_query(query)
)