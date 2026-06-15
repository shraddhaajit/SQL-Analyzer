import json


def count_plan_nodes(plan):

    count = 1

    if "Plans" in plan:
        for child in plan["Plans"]:
            count += count_plan_nodes(child)

    return count


def has_index_scan(plan):

    if plan.get("Node Type", "") in [
        "Index Scan",
        "Index Only Scan",
        "Bitmap Index Scan"
    ]:
        return True

    if "Plans" in plan:
        for child in plan["Plans"]:
            if has_index_scan(child):
                return True

    return False


def get_explain_features(query, connection):

    cursor = connection.cursor()

    cursor.execute(
        f"EXPLAIN (FORMAT JSON) {query}"
    )

    result = cursor.fetchone()

    plan = result[0][0]["Plan"]

    features = {
        "planner_estimated_rows": plan.get("Plan Rows", 0),
        "planner_total_cost": plan.get("Total Cost", 0),
        "planner_startup_cost": plan.get("Startup Cost", 0),
        "uses_index_scan": int(
            has_index_scan(plan)
        ),
        "plan_node_count": count_plan_nodes(plan)
    }

    cursor.close()

    return features