def calculate_complexity_score(features, max_cost=100):

    score = min(
        100,
        (
            features["join_count"] * 15
            + features["subquery_count"] * 20
            + features["aggregate_function_count"] * 8
            + features["order_by_column_count"] * 7
            + features["group_by_column_count"] * 7
            + features["has_distinct"] * 8
            + features["nesting_depth"] * 15
            + (
                features["planner_total_cost"]
                / max_cost
            )
            * 20
        ),
    )

    return round(score, 2)