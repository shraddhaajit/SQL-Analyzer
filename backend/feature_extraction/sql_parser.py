import sqlglot
from sqlglot import expressions as exp


def extract_structural_features(query: str):
    parsed = sqlglot.parse_one(query)

    features = {}

    # 1. table_count
    tables = list(parsed.find_all(exp.Table))
    features["table_count"] = len(set(t.name for t in tables))

    # 2. join_count
    joins = list(parsed.find_all(exp.Join))
    features["join_count"] = len(joins)

    # 3. has_cross_join
    features["has_cross_join"] = int(
        any(j.args.get("kind") == "CROSS" for j in joins)
    )

    # 4. has_outer_join
    features["has_outer_join"] = int(
        any(
            j.args.get("side") in ["LEFT", "RIGHT", "FULL"]
            for j in joins
        )
    )

    # 5. where_condition_count
    where = parsed.find(exp.Where)

    if where:
        predicates = [
            node
            for node in where.walk()
            if isinstance(
                node,
                (
                    exp.EQ,
                    exp.NEQ,
                    exp.GT,
                    exp.GTE,
                    exp.LT,
                    exp.LTE,
                    exp.Like,
                    exp.In,
                    exp.Between,
                ),
            )
        ]
        features["where_condition_count"] = len(predicates)
    else:
        features["where_condition_count"] = 0

    # 6. has_like
    features["has_like"] = int(
        any(parsed.find_all(exp.Like))
    )

    # 7. has_in_list
    features["has_in_list"] = int(
        any(parsed.find_all(exp.In))
    )

    # 8. group_by_column_count
    group = parsed.find(exp.Group)
    features["group_by_column_count"] = (
        len(group.expressions) if group else 0
    )

    # 9. order_by_column_count
    order = parsed.find(exp.Order)
    features["order_by_column_count"] = (
        len(order.expressions) if order else 0
    )

    # 10. has_having
    features["has_having"] = int(
        parsed.find(exp.Having) is not None
    )

    # 11. subquery_count
    features["subquery_count"] = len(
        list(parsed.find_all(exp.Subquery))
    )

    # 12. aggregate_function_count
    features["aggregate_function_count"] = len(
        [
            node
            for node in parsed.walk()
            if isinstance(
                node,
                (
                    exp.Count,
                    exp.Sum,
                    exp.Avg,
                    exp.Max,
                    exp.Min,
                ),
            )
        ]
    )

    # 13. has_distinct
    features["has_distinct"] = int(
        parsed.find(exp.Distinct) is not None
    )

    # 14. union_count
    features["union_count"] = len(
        list(parsed.find_all(exp.Union))
    )

    # 15. query_char_length
    features["query_char_length"] = len(query)

    # 16. nesting_depth
    features["nesting_depth"] = features["subquery_count"]

    return features