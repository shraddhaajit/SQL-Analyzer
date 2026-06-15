from fastapi import APIRouter

from backend.api.schemas import (
    QueryRequest
)

from backend.database.db_connection import (
    get_connection
)

from backend.feature_extraction.feature_vector import (
    build_feature_vector
)

from backend.optimization.advisor import (
    get_recommendations
)
from backend.history.history_manager import (
    save_query
)
from backend.utils.risk import (
    get_risk_level
)
router = APIRouter()


@router.post("/analyze")
def analyze_query(
    request: QueryRequest
):

    conn = get_connection()

    features = build_feature_vector(
        request.query,
        conn
    )

    recommendations = (
        get_recommendations(
            request.query,
            features
        )
    )
    tier, risk_level = (
    get_risk_level(
        features[
            "complexity_score"
        ]
    )
)
    save_query(
    request.query,
    0,
    risk_level
)   
    conn.close()
    return {
    "complexity_tier": tier,
    "risk_level": risk_level,
    "features": features,
    "recommendations": recommendations
}
