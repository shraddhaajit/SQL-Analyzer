from backend.optimization.rules import (
    check_missing_index,
    check_leading_wildcard,
    check_correlated_subquery,
    check_order_by,
    check_select_star,
    check_distinct_groupby,
    check_cross_join,
    check_high_cost
)

def get_recommendations(query, features):
    recommendations = []

    rules = [
        check_missing_index(features),
        check_leading_wildcard(query, features),
        check_correlated_subquery(query, features),
        check_order_by(features),
        check_select_star(query),
        check_distinct_groupby(features),
        check_cross_join(features),
        check_high_cost(features)
    ]

    for rule in rules:
        if rule:
            recommendations.append(rule)

    return recommendations