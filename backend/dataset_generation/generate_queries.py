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
        (1, TIER_1),
        (2, TIER_2),
        (3, TIER_3),
        (4, TIER_4),
        (5, TIER_5)
    ]

    for tier_num, templates in tiers:

        for _ in range(200):

            template = random.choice(
                templates
            )

            query = template.format(
                id=random.randint(1, 1000),
                price=random.randint(100, 5000),
                salary=random.randint(
                    30000,
                    100000
                ),
                city="Chennai",
                category="Electronics",
                amount=random.randint(
                    100,
                    10000
                ),
                count=random.randint(
                    1,
                    20
                )
            )

            queries.append(
                {
                    "tier": tier_num,
                    "query": query
                }
            )

    df = pd.DataFrame(queries)

    df.to_csv(
        "generated_queries.csv",
        index=False
    )

    print(
        f"{len(df)} queries generated"
    )


if __name__ == "__main__":
    generate_queries()