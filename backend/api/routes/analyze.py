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

from backend.prediction.model_loader import (
    load_model
)

from backend.prediction.predictor import (
    predict_execution_time
)

from backend.prediction.confidence_interval import (
    get_confidence_interval
)

from backend.prediction.feature_formatter import (
    prepare_features
)

router = APIRouter()

DT_MODEL = load_model(
    "ml_pipeline/models/dt_model.joblib"
)

RF_MODEL = load_model(
    "ml_pipeline/models/rf_model.joblib"
)

XGB_MODEL = load_model(
    "ml_pipeline/models/xgb_model.joblib"
)

@router.post("/analyze")
def analyze_query(
    request: QueryRequest
):

    conn = get_connection()

    features = build_feature_vector(
        request.query,
        conn
    )

    formatted_features = (
        prepare_features(
            features
        )
    )

    if request.model == "dt":

      model = DT_MODEL

    elif request.model == "xgb":

       model = XGB_MODEL

    else:

        model = RF_MODEL

    prediction = (
        predict_execution_time(
        model,
        formatted_features
    )
)

    confidence_interval = (
        get_confidence_interval(
            prediction
        )
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
        prediction,
        risk_level
    )

    conn.close()

    return {
        "predicted_execution_time_ms":
            prediction,

        "confidence_interval":
            confidence_interval,

        "complexity_tier":
            tier,

        "risk_level":
            risk_level,

        "features":
            features,

        "recommendations":
            recommendations,
        "model_used":
    request.model
    }