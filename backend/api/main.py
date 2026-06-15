from fastapi import FastAPI

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

app = FastAPI(
    title="SQL Analyzer API"
)


@app.get("/")
def home():

    return {
        "message":
        "SQL Analyzer Backend Running"
    }


@app.post("/analyze")
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

    conn.close()

    return {
        "features": features,
        "recommendations": recommendations
    }