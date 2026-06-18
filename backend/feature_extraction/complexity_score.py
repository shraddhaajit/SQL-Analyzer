def calculate_complexity_score(features, max_cost=15000):
    """
    Compute a 0–100 complexity score.

    Calibration targets:
      Simple lookup (1 table, PK WHERE)          →  5–15
      Multi-filter single table                   → 15–30
      2-table JOIN with WHERE                     → 25–45
      Aggregation + GROUP BY + HAVING             → 35–55
      Subquery IN / EXISTS                        → 45–65
      3+ table JOINs with aggregation             → 55–75
      Correlated subqueries (3+)                  → 70–90
      CROSS JOIN or deeply nested subqueries      → 85–100
    """
    import math

    # ----------------------------------------------------------------
    # 1. Structural score
    # ----------------------------------------------------------------
    structural_score = (
        features.get("table_count", 1)              * 4
        + features.get("join_count", 0)             * 9
        + features.get("has_outer_join", 0)         * 6
        + features.get("has_cross_join", 0)         * 30   # catastrophic
        + features.get("subquery_count", 0)         * 14   # correlated = expensive
        + features.get("nesting_depth", 0)          * 11
        + features.get("where_condition_count", 0)  * 2
        + features.get("has_like", 0)               * 8    # full scan
        + features.get("has_in_list", 0)            * 5
        + features.get("group_by_column_count", 0)  * 5
        + features.get("aggregate_function_count", 0) * 4
        + features.get("has_having", 0)             * 6
        + features.get("order_by_column_count", 0)  * 4
        + features.get("has_distinct", 0)           * 5
        + features.get("union_count", 0)            * 12
    )

    # ----------------------------------------------------------------
    # 2. Planner cost (log scale, up to 30 pts)
    # ----------------------------------------------------------------
    cost = float(features.get("planner_total_cost", 10.0))
    cost = max(1.0, cost)
    # log10(10)=1, log10(1000)=3, log10(100000)=5 → scale to 0-30
    cost_score = min(30.0, math.log10(cost) * 5.5)

    # ----------------------------------------------------------------
    # 3. Query length (up to 6 pts)
    # ----------------------------------------------------------------
    length = float(features.get("query_char_length", 50))
    length_score = min(6.0, length / 120.0)

    # ----------------------------------------------------------------
    # 4. Combine and clip to 5–100
    # ----------------------------------------------------------------
    total = structural_score + cost_score + length_score

    # Soft normalization: structural_score alone can reach ~200 for extreme
    # queries, so divide by a reasonable maximum before clipping.
    # A max-complexity query (cross join + 5 subqueries + 7 joins + …)
    # gives structural ≈ 195 + cost ≈ 30 + length ≈ 6 = 231.
    # We normalise to 100 against that ceiling.
    normalized = total / 2.31

    score = max(5.0, min(100.0, normalized))
    return round(score, 2)