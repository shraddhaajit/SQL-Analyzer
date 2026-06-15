from backend.feature_extraction.sql_parser import (
    extract_structural_features,
)

from backend.feature_extraction.explain_parser import (
    get_explain_features,
)

from backend.feature_extraction.complexity_score import (
    calculate_complexity_score,
)


def build_feature_vector(query, connection):

    structural_features = (
        extract_structural_features(query)
    )

    planner_features = (
        get_explain_features(
            query,
            connection,
        )
    )

    features = {
        **structural_features,
        **planner_features,
    }

    features["complexity_score"] = (
        calculate_complexity_score(
            features
        )
    )

    return features