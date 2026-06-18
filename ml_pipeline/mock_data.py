import pandas as pd
import numpy as np


def generate_mock_data(n_samples=9000):
    """
    Generate synthetic training data calibrated to production-scale timing.

    Production table sizes:
      customers  = 100,000 rows
      orders     = 500,000 rows
      products   =  10,000 rows
      payments   = 500,000 rows

    All timing estimates reflect what those queries would take at that scale
    when the database server is under typical load and indexes are absent on
    foreign-key / filter columns (a realistic worst-case / teaching scenario).
    """
    np.random.seed(42)

    # ------------------------------------------------------------------
    # 1. Structural features
    # ------------------------------------------------------------------
    data = {
        "table_count":             np.random.randint(1, 7, n_samples),
        "join_count":              np.random.randint(0, 8, n_samples),
        "has_cross_join":          np.random.choice([0, 1], n_samples, p=[0.92, 0.08]),
        "has_outer_join":          np.random.choice([0, 1], n_samples, p=[0.82, 0.18]),
        "where_condition_count":   np.random.randint(0, 12, n_samples),
        "has_like":                np.random.choice([0, 1], n_samples, p=[0.60, 0.40]),
        "has_in_list":             np.random.choice([0, 1], n_samples, p=[0.65, 0.35]),
        "group_by_column_count":   np.random.randint(0, 5, n_samples),
        "order_by_column_count":   np.random.randint(0, 4, n_samples),
        "has_having":              np.random.choice([0, 1], n_samples, p=[0.80, 0.20]),
        "subquery_count":          np.random.randint(0, 6, n_samples),
        "aggregate_function_count":np.random.randint(0, 7, n_samples),
        "has_distinct":            np.random.choice([0, 1], n_samples, p=[0.75, 0.25]),
        "union_count":             np.random.randint(0, 3, n_samples),
        "query_char_length":       np.random.randint(30, 2000, n_samples),
        "nesting_depth":           np.random.randint(0, 5, n_samples),
    }

    df = pd.DataFrame(data)

    # ------------------------------------------------------------------
    # 2. Planner features — correlated with structural complexity
    # ------------------------------------------------------------------
    join_factor  = 1 + df["join_count"] * 1.5
    cross_factor = 1 + df["has_cross_join"] * 20

    data["planner_estimated_rows"] = (
        np.random.exponential(600, n_samples) * join_factor * cross_factor
    ).clip(1, 8_000_000)

    data["planner_total_cost"] = (
        (80
         + df["join_count"]      * 900
         + df["subquery_count"]  * 2800
         + df["has_cross_join"]  * 35_000
         + df["table_count"]     * 180)
        * np.random.lognormal(0, 0.5, n_samples)
    ).clip(1, 250_000)

    data["planner_startup_cost"] = (
        data["planner_total_cost"] * np.random.uniform(0.01, 0.7, n_samples)
    )

    # Queries with many joins / cross joins rarely use index scans
    index_prob = np.where(
        df["has_cross_join"] == 1, 0.04,
        np.where(df["join_count"] >= 5, 0.18,
        np.where(df["join_count"] >= 3, 0.40,
        np.where(df["join_count"] >= 1, 0.62, 0.85)))
    )
    data["uses_index_scan"] = np.random.binomial(1, index_prob)

    data["plan_node_count"] = (
        2
        + df["join_count"]             * 2
        + df["subquery_count"]         * 3
        + df["has_cross_join"]         * 5
        + df["group_by_column_count"]
    ).clip(1, 60).astype(int)

    df = pd.DataFrame(data)

    # ------------------------------------------------------------------
    # 3. Complexity score (0–100)
    # ------------------------------------------------------------------
    complexity_raw = (
        df["join_count"]              * 6
        + df["subquery_count"]        * 14
        + df["has_cross_join"]        * 35
        + df["has_outer_join"]        * 5
        + df["group_by_column_count"] * 4
        + df["has_having"]            * 5
        + df["where_condition_count"] * 1.5
        + df["has_like"]              * 6
        + df["nesting_depth"]         * 12
        + df["aggregate_function_count"] * 3
        + df["union_count"]           * 8
        + np.log1p(data["planner_total_cost"]) * 1.5
    )
    cmax = complexity_raw.max()
    data["complexity_score"] = (complexity_raw / cmax * 100).clip(0, 100)
    df = pd.DataFrame(data)

    # ------------------------------------------------------------------
    # 4. Production-calibrated execution time (milliseconds)
    #
    # Key reference points:
    #   Simple PK lookup:                   ~2–10 ms
    #   Full scan (100k rows, no index):    ~80–300 ms
    #   3-table equi-join (no index):       ~400–1,200 ms
    #   Correlated subquery × 100k rows:    ~1,000–8,000 ms per subquery
    #   LIKE '%x%' (full scan):             +200–600 ms
    #   CROSS JOIN (100k × 500k):           ~10,000–60,000 ms
    # ------------------------------------------------------------------

    # Joins — each additional join multiplies intermediate rows
    join_base = df["join_count"] * 70 * (1 + df["join_count"] * 0.28)

    # Correlated subqueries — runs once per outer row; deeply nested are worse
    subq_cost = df["subquery_count"] * 900 * (1 + df["nesting_depth"] * 0.7)

    # CROSS JOIN: Cartesian product of tables ≈ catastrophic
    cross_cost = df["has_cross_join"] * 14_000 * np.random.uniform(0.5, 4.0, n_samples)

    # LIKE with wildcard: full sequential scan of the filtered table
    like_cost = df["has_like"] * 280

    # IN (subquery): correlated or materialised inner scan
    in_cost = df["has_in_list"] * 130

    # GROUP BY / aggregation over large intermediate result
    agg_cost = (
        df["group_by_column_count"] * 90
        + df["aggregate_function_count"] * 28
        + df["has_having"] * 55
    )

    # ORDER BY without a matching index
    order_cost = df["order_by_column_count"] * 70

    # DISTINCT requires a deduplication pass
    distinct_cost = df["has_distinct"] * 160

    # UNION adds extra scan + merge passes
    union_cost = df["union_count"] * 350

    # Planner total cost — solid monotone proxy for overall plan cost
    planner_component = np.log1p(df["planner_total_cost"]) * 16

    # Index scans are dramatically faster; missing indexes blow up cost
    index_factor = np.where(df["uses_index_scan"], 0.28, 1.45)

    time_ms = (
        3.0           # base
        + join_base
        + subq_cost
        + cross_cost
        + like_cost
        + in_cost
        + agg_cost
        + order_cost
        + distinct_cost
        + union_cost
        + planner_component
    ) * index_factor

    # Realistic lognormal noise (σ=0.35 ≈ ±40 % variance)
    noise = np.random.lognormal(mean=0, sigma=0.35, size=n_samples)
    df["median_execution_time_ms"] = (time_ms * noise).clip(0.5, 120_000)

    # ------------------------------------------------------------------
    # 5. Tier labels (1–5) for stratified train/test split
    # ------------------------------------------------------------------
    tiers = []
    for score in data["complexity_score"]:
        if score < 20:
            tiers.append(1)
        elif score < 40:
            tiers.append(2)
        elif score < 60:
            tiers.append(3)
        elif score < 80:
            tiers.append(4)
        else:
            tiers.append(5)
    df["tier"] = tiers

    return df


if __name__ == "__main__":
    df = generate_mock_data()
    df.to_csv("mock_dataset.csv", index=False)
    print("Created mock_dataset.csv with shape:", df.shape)
    print("\nExecution time distribution (ms):")
    print(df["median_execution_time_ms"].describe())
    print("\nHigh-risk query examples (subquery_count >= 3):")
    subset = df[df["subquery_count"] >= 3][["subquery_count", "join_count", "has_like", "median_execution_time_ms"]].head(5)
    print(subset.to_string())
