import random
import pandas as pd

from backend.dataset_generation.query_templates import (
    TIER_1,
    TIER_2,
    TIER_3,
    TIER_4,
    TIER_5
)

def generate_queries():
    queries = []
    
    tiers = [
        (1, TIER_1, 150),
        (2, TIER_2, 150),
        (3, TIER_3, 200),
        (4, TIER_4, 200),
        (5, TIER_5, 200)
    ]

    for tier_num, templates, count in tiers:
        for _ in range(count):
            template = random.choice(templates)
            query = template.format(
                id=random.randint(1, 100000),
                price=random.randint(100, 5000),
                salary=random.randint(30000, 150000),
                city=random.choice(["Chennai", "Mumbai", "Delhi", "Bangalore", "Kolkata"]),
                category=random.choice(["Electronics", "Clothing", "Books", "Furniture", "Sports"]),
                amount=random.randint(100, 10000),
                count=random.randint(1, 20)
            )
            queries.append({
                "tier": tier_num,
                "query": query.strip()
            })

    df = pd.DataFrame(queries)
    df.to_csv("generated_queries.csv", index=False)
    print(f"{len(df)} queries generated and written to generated_queries.csv")

if __name__ == "__main__":
    generate_queries()