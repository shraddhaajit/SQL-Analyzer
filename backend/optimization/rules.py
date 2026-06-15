def check_missing_index(features):

    if (
        features["join_count"] >= 2
        and features["uses_index_scan"] == 0
    ):
        return {
            "rule": "Missing Index on Join Key",
            "impact": "High",
            "recommendation":
                "Consider adding indexes on join columns."
        }

    return None


def check_leading_wildcard(query, features):

    if (
        features["has_like"] == 1
        and "LIKE '%" in query.upper()
    ):
        return {
            "rule": "Leading Wildcard LIKE",
            "impact": "High",
            "recommendation":
                "Use trigram indexes or full text search."
        }

    return None


def check_order_by(features):

    if (
        features["order_by_column_count"] > 0
        and features["uses_index_scan"] == 0
    ):
        return {
            "rule": "ORDER BY Without Index",
            "impact": "Medium",
            "recommendation":
                "Create index on sort columns."
        }

    return None


def check_select_star(query):

    if "SELECT *" in query.upper():

        return {
            "rule": "SELECT * Detected",
            "impact": "Low",
            "recommendation":
                "Select only required columns."
        }

    return None


def check_distinct_groupby(features):

    if (
        features["has_distinct"] == 1
        and features["group_by_column_count"] > 0
    ):
        return {
            "rule": "DISTINCT With GROUP BY",
            "impact": "Low",
            "recommendation":
                "DISTINCT is usually redundant with GROUP BY."
        }

    return None


def check_cross_join(features):

    if features["has_cross_join"] == 1:

        return {
            "rule": "CROSS JOIN Detected",
            "impact": "Critical",
            "recommendation":
                "Check for missing join condition."
        }

    return None


def check_high_cost(features):

    if (
        features["planner_total_cost"] > 100
        and features["uses_index_scan"] == 0
    ):
        return {
            "rule": "High Planner Cost",
            "impact": "High",
            "recommendation":
                "Review indexes and execution plan."
        }

    return None